import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import xgboost as xgb
import shap

OUT_DIR = "reports/figures/shap/xgboost_finetuned"
os.makedirs(OUT_DIR, exist_ok=True)

# 1. Load data
val = pd.read_csv("data/processed/features-val.csv")

def add_features(df):
    d = df.copy()
    d["bjerknes_coupling"] = d["ssta"] * d["west_pac_zwind_anom"]
    d["thermal_acceleration"] = d["ssta_change1"] - (d["ssta_lag1"] - d["ssta_lag2"])
    d["wind_divergence"] = d["basin_zwind_anom"] - d["west_pac_zwind_anom"]
    d["momentum_wind"] = d["ssta_change3"] * d["zonal_wind_anom"]
    d["air_sea_diff"] = d["air_temp_anom"] - d["ssta"]
    d["nino_coupling"] = d["nino34_ssta"] * d["basin_zwind_anom"]
    d["wpac_wind_positive"] = np.maximum(0, d["west_pac_zwind_anom"])
    d["wind_burst_x_ssta"] = d["wpac_wind_positive"] * d["ssta"]
    return d

val_eng = add_features(val)

features_base = [
    "ssta", "ssta_lag1", "ssta_lag2", "ssta_lag3", "ssta_roll3", "ssta_change1", "ssta_change3",
    "basin_ssta", "nino34_ssta", "nino34_ssta_roll3", "basin_zwind_anom", "west_pac_zwind_anom",
    "air_temp_anom", "air_temp_anom_lag1", "zonal_wind_anom", "mer_wind_anom"
]

features_fine = features_base + [
    "bjerknes_coupling", "thermal_acceleration", "wind_divergence", 
    "momentum_wind", "air_sea_diff", "nino_coupling", "wpac_wind_positive", "wind_burst_x_ssta"
]

# 2. Load models
m_base = xgb.XGBRegressor()
m_base.load_model("models/best_xgboost_residual_model.json")

m_fine = xgb.XGBRegressor()
m_fine.load_model("models/best_xgboost_finetuned_model.json")

# 3. Compute SHAP explanations
X_base = val[features_base]
X_fine = val_eng[features_fine]

explainer_base = shap.TreeExplainer(m_base)
exp_base = explainer_base(X_base)

explainer_fine = shap.TreeExplainer(m_fine)
exp_fine = explainer_fine(X_fine)

print("Baseline SHAP shape:", exp_base.values.shape)
print("Fine-tuned SHAP shape:", exp_fine.values.shape)

# Helper for saving
def save_fig(path):
    fig = plt.gcf()
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved: {path}")

# 4. Summary Bar Plot
shap.plots.bar(exp_fine, max_display=len(features_fine), show=False)
plt.title("Fine-Tuned XGBoost: Average Impact on Predicted 3-Month Change Δ (°C)", fontsize=11, fontweight="bold")
save_fig(os.path.join(OUT_DIR, "bar.png"))

# 5. Summary Beeswarm Plot
shap.plots.beeswarm(exp_fine, max_display=len(features_fine), show=False)
plt.title("Fine-Tuned XGBoost: Feature Value vs SHAP Push on Δ (°C)", fontsize=11, fontweight="bold")
save_fig(os.path.join(OUT_DIR, "beeswarm.png"))

# 6. Dependence Plots
# Top 4 features + momentum_wind
for feat in ["ssta", "ssta_lag3", "wind_burst_x_ssta", "momentum_wind"]:
    shap.plots.scatter(exp_fine[:, feat], show=False)
    plt.title(f"Fine-Tuned XGBoost: Dependence Plot for {feat}", fontsize=11, fontweight="bold")
    save_fig(os.path.join(OUT_DIR, f"dependence_{feat}.png"))

# 7. Waterfall Plots
val_eng["pred_delta_fine"] = m_fine.predict(X_fine)
val_eng["forecast_ssta_fine"] = val_eng["ssta"] + val_eng["pred_delta_fine"]

def classify_fine(a):
    if a >= 1.10:   return "Extreme Warm"
    if a >= 0.35:   return "Moderate Warm"
    if a <= -0.95:  return "Extreme Cool"
    if a <= -0.45:  return "Moderate Cool"
    return "Neutral"

val_eng["forecast_tier_fine"] = val_eng["forecast_ssta_fine"].map(classify_fine)

WATERFALL_CASES = [
    ("-2_-125", "1995-11", "correct_extreme_cool", "Correct Extreme Cool Warning"),
    ("0_-95",   "1995-02", "improved_extreme_cool", "Extreme Cool Caught by Fine-Tuned (Missed by Baseline)"),
    ("0_-170",  "1994-08", "correct_extreme_warm", "Correct Extreme Warm Warning"),
    ("0_-170",  "1994-07", "missed_extreme_warm",  "Missed Extreme Warm (Jul 1994)")
]

for site, ym, file_stem, label in WATERFALL_CASES:
    row_idx = val_eng.index[(val_eng["site_id"] == site) & (val_eng["ym"] == ym)][0]
    r = val_eng.loc[row_idx]
    title = (
        f"{label} ({site}, {ym})\n"
        f"Today SSTA {r['ssta']:+.2f} + Pred Δ {r['pred_delta_fine']:+.2f} = Forecast {r['forecast_ssta_fine']:+.2f} °C ({r['forecast_tier_fine']})\n"
        f"Actual 3mo Target: {r['target_ssta']:+.2f} °C ({r['target_risk']})"
    )
    shap.plots.waterfall(exp_fine[row_idx], max_display=10, show=False)
    plt.title(title, fontsize=9)
    save_fig(os.path.join(OUT_DIR, f"waterfall_{file_stem}.png"))

print("All plots generated successfully!")
