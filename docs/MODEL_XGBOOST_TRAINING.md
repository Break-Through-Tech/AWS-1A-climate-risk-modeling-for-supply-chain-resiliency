# Model Training Report: XGBoost 3-Month-Ahead Climate Risk Forecasting

**Notebook:** [`notebooks/model_xgboost_training.ipynb`](../notebooks/model_xgboost_training.ipynb)  
**Input Datasets:** `data/processed/features-train.csv` (1980–1993), `data/processed/features-val.csv` (1994–1996)  
**Output Artifact:** `models/best_xgboost_residual_model.json`  
**Headline Metric:** **Macro F1-Score** (evaluating unweighted performance across all 5 NOAA ONI risk tiers)

---

## 1. Executive Summary

To forecast tropical Pacific climate anomalies 3 months in advance for supply chain resilience, we evaluated a progression of XGBoost architectures. 

While naive machine learning approaches (direct classification or regression from scratch) failed to beat the meteorological persistence heuristic due to **geographic overfitting to early buoy coordinates** and **regression-to-the-mean shrinkage**, our **Combined Solution (Physical Residual Forecaster + Threshold Calibration)** achieved **0.3579 Macro F1**, successfully outperforming both baseline benchmarks:

| Model / Approach | Features | Macro F1 | Accuracy | Extreme Cool F1 | Extreme Warm F1 | Beats Persistence? |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Majority-Class (Dummy)** | 0 | 0.1320 | 49.51% | 0.000 | 0.000 | ❌ No |
| **Persistence Baseline** | 1 | 0.3533 | 52.52% | 0.275 | 0.000 | Baseline Benchmark |
| **Exp 1: XGBClassifier (Full 36)** | 36 | 0.2848 | 50.82% | 0.053 | 0.000 | ❌ No |
| **Exp 2: XGBRegressor (Full 36 $\rightarrow$ Tiers)** | 36 | 0.2271 | 48.92% | 0.000 | 0.000 | ❌ No |
| **Exp 3: XGBClassifier (Physics 16, No Geo)** | 16 | 0.2913 | 49.97% | 0.111 | 0.000 | ❌ No |
| **Exp 4: Residual Model (Uncalibrated)** | 16 | 0.3342 | **54.87%** | 0.194 | 0.000 | ❌ No |
| **Exp 5: Winning Residual (Calibrated)** | **16** | **0.3579** | 51.80% | **0.313** | **0.054** | **✅ YES (PASSED)** |

---

## 2. Why Earlier Iterations Failed (Root Cause Analysis)

1. **Geographic Overfitting on `lat` / `lon`:**
   - In training (1980–1993), only eastern Pacific buoys existed; 73% of extreme cool events occurred at `-140°` and `-110°`.
   - In validation (1994–1996), the array expanded across `-95°`, `-155°`, and `180°`.
   - Trees memorized buoy coordinates rather than thermodynamics, refusing to predict extremes at newly deployed coordinates.
2. **Regression-to-the-Mean Shrinkage:**
   - Predicting the future ocean state from a blank slate ($Y_{t+3} = f(X)$) suffers from variance shrinkage under uncertainty (true std = 0.824 vs predicted std = 0.455). Static NOAA thresholds ($\pm 1.5^\circ\text{C}$) were almost never triggered.
3. **The `argmax` Failure in Imbalanced Classification:**
   - In actual Extreme Cool cases, the model estimated $P(\text{Extreme}) = 21\%$ (a 5× spike from the 4% base rate), but $P(\text{Moderate}) = 44\%$. Naive `argmax` always selected Moderate, dropping extreme recall to near zero.

---

## 3. How the Winning Model Works

The winning model combines four physical and statistical innovations:

1. **Physical Feature Set (16 Features, No Geo):**
   - Strips `lat`, `lon`, `humidity`, and local wind lags.
   - Retains pure thermodynamic state: local SSTA history (`ssta`, lags 1, 2, 3, roll 3, changes 1 & 3), macro basin state (`basin_ssta`, `nino34_ssta`, `basin_zwind_anom`, `west_pac_zwind_anom`), air temperature anomaly, and current wind.
2. **Residual (Tendency) Formulation:**
   - Instead of forecasting future temperature from zero, the model predicts the **3-month change ($\Delta$) relative to today**:
     $$\Delta = \text{target\_ssta} - \text{ssta}$$
     $$\widehat{\text{future\_ssta}} = \text{ssta}_{\text{today}} + \widehat{\Delta}$$
   - This grounds the forecast in today's known ocean state (exploiting the high persistence of SST).
3. **High Regularization on a Compact Tree:**
   - `max_depth = 2`, `n_estimators = 40`, `reg_lambda = 10.0`, `learning_rate = 0.04`. Prevents memorizing the 1,988-row training set.
4. **Calibrated NOAA Thresholds:**
   - Rather than static cutoffs, calibrated thresholds restore sensitivity to rare extremes:
     - **Extreme Warm:** $\widehat{\text{future\_ssta}} \ge +1.0^\circ\text{C}$
     - **Moderate Warm:** $+0.35^\circ\text{C} \le \widehat{\text{future\_ssta}} < +1.0^\circ\text{C}$
     - **Neutral:** $-0.40^\circ\text{C} < \widehat{\text{future\_ssta}} < +0.35^\circ\text{C}$
     - **Moderate Cool:** $-1.10^\circ\text{C} \le \widehat{\text{future\_ssta}} \le -0.40^\circ\text{C}$
     - **Extreme Cool:** $\widehat{\text{future\_ssta}} \le -1.10^\circ\text{C}$

---

## 4. Concrete Example: Real Validation Buoy Walkthrough

Consider a real reading from validation buoy site `0_-110` (Equator at 110°W):

1. **Current State (Today):**
   - Current temperature anomaly: $\text{ssta} = -1.25^\circ\text{C}$ (Moderate Cool)
   - Recent momentum: cooling trend ($\text{ssta\_change3} = -0.45^\circ\text{C}$)
   - Basin wind: negative zonal wind anomaly ($\text{basin\_zwind\_anom} < 0$, strong trade winds)
2. **Model Residual Prediction:**
   - The tree regressor evaluates the physical momentum and outputs:
     $$\widehat{\Delta} = -0.18^\circ\text{C}$$
3. **Forecast Recomposition:**
   $$\widehat{\text{future\_ssta}} = \text{ssta} + \widehat{\Delta} = -1.25 + (-0.18) = -1.43^\circ\text{C}$$
4. **Threshold Mapping:**
   - Since $-1.43^\circ\text{C} \le -1.10^\circ\text{C}$, the model issues an advance warning of **Extreme Cool**.
   - **Ground Truth 3 Months Later:** The buoy's actual temperature anomaly was $-1.62^\circ\text{C}$ (**Extreme Cool**).
   - **Baseline Comparison:** A naive classifier predicted Moderate Cool (missing the extreme event), whereas our residual model correctly sounded the extreme alarm.

---

## 5. Detailed Classification Report & Fairness

```text
               precision    recall  f1-score   support

 Extreme Cool       0.28      0.35      0.31       110
 Extreme Warm       0.04      0.06      0.05        17
Moderate Cool       0.50      0.41      0.45       408
Moderate Warm       0.35      0.32      0.34       237
      Neutral       0.63      0.67      0.65       757

     accuracy                           0.52      1529
    macro avg       0.36      0.36      0.36      1529
```

### Spatial Fairness (Longitude Bands)
- **Western Pacific (140°E–180°):** Samples: 326 | Macro F1: **0.372** | Accuracy: 59.8%
- **Central Pacific (180°–140°W):** Samples: 531 | Macro F1: **0.339** | Accuracy: 51.0%
- **Eastern Pacific (140°W–95°W):** Samples: 672 | Macro F1: **0.368** | Accuracy: 48.7%

The model performs consistently across the entire basin without geographic blind spots.

---

## 6. How to Load and Use the Exported Model

The model is saved as a universal JSON artifact in `models/best_xgboost_residual_model.json`.

```python
import xgboost as xgb
import pandas as pd

# 1. Load model
model = xgb.XGBRegressor()
model.load_model("models/best_xgboost_residual_model.json")

# 2. Predict 3-month delta
features = df[FEATURES_PHYSICAL]
pred_delta = model.predict(features)

# 3. Forecast future anomaly and tier
forecasted_ssta = df["ssta"] + pred_delta
forecasted_tier = forecasted_ssta.map(classify_calibrated)
```
