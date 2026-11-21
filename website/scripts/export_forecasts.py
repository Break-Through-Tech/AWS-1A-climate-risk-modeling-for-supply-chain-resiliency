"""Precompute the Forecast page's answers for every validation buoy-month.

The website has no backend, so the forecasts are computed here once and saved
as public/forecasts/forecasts.json. The steps match model_xgboost_training.ipynb and
model_explainability.ipynb exactly:

1. Load the validation features and the saved XGBoost residual model.
2. Predict the 3-month change in SST anomaly (delta).
3. Forecast = today's anomaly + delta, mapped to a tier with the calibrated thresholds.
4. Explain each forecast with SHAP and keep the three biggest pushes.

Needs the processed data (data/processed/features-val.csv) and the trained model
(models/best_xgboost_residual_model.json), which are not in git. Run from website/
with the repo's Python environment:

    ../.venv/bin/python scripts/export_forecasts.py
"""

import json
import pathlib

import numpy as np
import pandas as pd
import shap
import xgboost as xgb
from sklearn.metrics import f1_score

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
VAL_PATH = REPO_ROOT / "data" / "processed" / "features-val.csv"
MODEL_PATH = REPO_ROOT / "models" / "best_xgboost_residual_model.json"
OUTPUT = pathlib.Path(__file__).resolve().parents[1] / "public" / "forecasts" / "forecasts.json"

# Must match FEATURES_PHYSICAL in model_xgboost_training.ipynb exactly, including order.
FEATURES_PHYSICAL = [
    "ssta", "ssta_lag1", "ssta_lag2", "ssta_lag3", "ssta_roll3", "ssta_change1", "ssta_change3",
    "basin_ssta", "nino34_ssta", "nino34_ssta_roll3", "basin_zwind_anom", "west_pac_zwind_anom",
    "air_temp_anom", "air_temp_anom_lag1", "zonal_wind_anom", "mer_wind_anom",
]

# Plain-English names shown on the website.
FEATURE_LABELS = {
    "ssta": "Today’s anomaly",
    "ssta_lag1": "Anomaly 1 month ago",
    "ssta_lag2": "Anomaly 2 months ago",
    "ssta_lag3": "Anomaly 3 months ago",
    "ssta_roll3": "3-month average anomaly",
    "ssta_change1": "1-month change in anomaly",
    "ssta_change3": "3-month change in anomaly",
    "basin_ssta": "Pacific-wide average anomaly",
    "nino34_ssta": "Niño 3.4 anomaly",
    "nino34_ssta_roll3": "Niño 3.4 3-month average",
    "basin_zwind_anom": "Pacific-wide wind anomaly",
    "west_pac_zwind_anom": "Western Pacific wind",
    "air_temp_anom": "Air temperature anomaly",
    "air_temp_anom_lag1": "Air temperature anomaly 1 month ago",
    "zonal_wind_anom": "East–west wind anomaly",
    "mer_wind_anom": "North–south wind anomaly",
}

THRESHOLDS = {"extreme_warm": 1.0, "moderate_warm": 0.35, "moderate_cool": -0.4, "extreme_cool": -1.1}


def classify_calibrated(a):
    """Same calibrated thresholds as the winning model in model_xgboost_training.ipynb."""
    if a >= THRESHOLDS["extreme_warm"]:
        return "Extreme Warm"
    if a >= THRESHOLDS["moderate_warm"]:
        return "Moderate Warm"
    if a <= THRESHOLDS["extreme_cool"]:
        return "Extreme Cool"
    if a <= THRESHOLDS["moderate_cool"]:
        return "Moderate Cool"
    return "Neutral"


def buoy_label(lat, lon):
    ns = "N" if lat > 0 else "S" if lat < 0 else ""
    ew = "E" if lon > 0 else "W" if lon < 0 else ""
    lat_txt = f"{abs(lat):g}°{ns}"
    lon_txt = "180°" if abs(lon) == 180 else f"{abs(lon):g}°{ew}"
    return f"{lat_txt}, {lon_txt}"


def add_months(ym, n):
    year, month = map(int, ym.split("-"))
    total = year * 12 + (month - 1) + n
    return f"{total // 12}-{total % 12 + 1:02d}"


def r(x, digits=2):
    return None if pd.isna(x) else round(float(x), digits)


def main():
    val = pd.read_csv(VAL_PATH)
    # Same filter as the training and SHAP notebooks: the 1,529 scored validation rows.
    val = val.dropna(subset=["target_risk", "target_ssta", "current_risk"]).reset_index(drop=True)
    X = val[FEATURES_PHYSICAL]

    model = xgb.XGBRegressor()
    model.load_model(MODEL_PATH)
    assert model.get_booster().feature_names == FEATURES_PHYSICAL, "Feature list or order differs from training"

    delta = model.predict(X)
    forecast = val["ssta"].to_numpy() + delta
    tiers = [classify_calibrated(a) for a in forecast]
    shap_values = shap.TreeExplainer(model)(X).values

    macro_f1 = f1_score(val["target_risk"], tiers, average="macro", zero_division=0)
    persistence_f1 = f1_score(val["target_risk"], val["current_risk"], average="macro", zero_division=0)

    buoys = {}
    forecasts = {}
    for i, row in val.iterrows():
        site = row["site_id"]
        buoys.setdefault(site, {"id": site, "lat": r(row["lat"], 1), "lon": r(row["lon"], 1),
                                "label": buoy_label(row["lat"], row["lon"])})
        order = np.argsort(-np.abs(shap_values[i]))
        reasons = [
            {"feature": FEATURES_PHYSICAL[j], "value": r(X.iloc[i, j]), "shap": r(shap_values[i, j], 3)}
            for j in order[:3] if abs(shap_values[i, j]) >= 0.0005
        ]
        forecasts.setdefault(site, []).append({
            "month": row["ym"],
            "targetMonth": add_months(row["ym"], 3),
            "today": r(row["ssta"]),
            "todayTier": row["current_risk"],
            "delta": r(delta[i]),
            "forecast": r(forecast[i]),
            "tier": tiers[i],
            "actual": r(row["target_ssta"]),
            "actualTier": row["target_risk"],
            "persistenceTier": row["current_risk"],
            "reasons": reasons,
        })

    output = {
        "model": "XGBoost residual model (best_xgboost_residual_model.json)",
        "period": f"{val['ym'].min()} to {val['ym'].max()} (validation)",
        "leadMonths": 3,
        "thresholds": THRESHOLDS,
        "featureLabels": FEATURE_LABELS,
        "metrics": {"macroF1": round(macro_f1, 4), "persistenceMacroF1": round(persistence_f1, 4), "rows": len(val)},
        "buoys": sorted(buoys.values(), key=lambda b: (b["lon"] % 360, -b["lat"])),
        "forecasts": forecasts,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(REPO_ROOT)}: {len(val):,} forecasts at {len(buoys)} buoys, "
          f"{OUTPUT.stat().st_size / 1024:.0f} KB")
    print(f"macro F1 {macro_f1:.4f} vs persistence {persistence_f1:.4f}")


if __name__ == "__main__":
    main()
