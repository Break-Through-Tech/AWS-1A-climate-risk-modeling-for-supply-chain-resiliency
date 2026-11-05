# Model Training Decisions & Experiments

Numbers below match the current `notebooks/model_training_regression.ipynb` outputs (absolute LightGBM + feature experiments) and a verified residual/delta rerun with the same `lgbm_params`.

**Current main hyperparameters**

| Setting | Value |
| --- | --- |
| `learning_rate` | 0.04 |
| `num_leaves` / `max_depth` | 8 / 7 |
| `min_child_samples` | 25 |
| `lambda_l1` / `lambda_l2` | 0.2 / 1.5 |
| `num_boost_round` | 250 |
| early stopping | 30 |

---

## 1. Switch from risk classification to SSTA regression

**Decision / Hypothesis**  
Multiclass `target_risk` training was collapsing toward Neutral and missing extremes. Predicting continuous `target_ssta` (then binning to NOAA tiers) should preserve magnitude information and improve ranking of warm/cool events.

**Experiment**  

- Target: `target_ssta` (3-month-ahead anomaly)  
- Model: LightGBM **regressor** (RMSE)  
- Risk metrics: bin preds with the same NOAA thresholds used for `target_risk`

**Results (absolute / main model)**  

| Split | RMSE  | MAE   | Macro F1 |
| ----- | ----- | ----- | -------- |
| Train | 0.421 | 0.301 | —        |
| Val   | 0.759 | 0.563 | 0.209    |
| Test  | 1.165 | 0.826 | 0.299    |

**Interpretation**  
Regression is usable and gives a continuous forecast, but Macro F1 on val is still weak. Test F1 looks better mainly because the 1997–98 test mix differs from val—not because the model clearly solved extremes.

---

## 2. LightGBM vs Dummy & Persistence baselines

**Decision / Hypothesis**  
Any useful model must beat:

1. **Dummy** — always `Neutral`
2. **Persistence** — `target_risk = current_risk`

Persistence is the real bar (ENSO is strongly autocorrelated).

**Experiment**  
Score Dummy, Persistence, and binned absolute LightGBM on val and test.

**Results**

| Model | Val Acc | Val Macro F1 | Test Acc | Test Macro F1 |
| --- | --- | --- | --- | --- |
| Dummy | 0.495 | 0.132 | 0.450 | 0.124 |
| Persistence | 0.525 | **0.353** | 0.438 | **0.308** |
| LightGBM (absolute, full features) | 0.514 | 0.209 | 0.496 | 0.299 |

**Interpretation**  

- Beats Dummy on both splits.  
- **Does not beat Persistence on val** (0.209 vs 0.353).  
- On test, roughly tied with Persistence (0.299 vs 0.308).  
- Extremes remain the failure mode (Extreme Cool/Warm F1 = 0 on val for absolute LightGBM).

---

## 3. Hyperparameter changes for overfitting

**Hypothesis**  
Large train/val RMSE gap meant the model was memorizing train. Stronger regularization + slower learning should improve validation generalization.

**Experiment history**  
An earlier, more aggressive regularized config was tried (`learning_rate=0.02`, `min_child_samples=40`, higher L1/L2, 300 rounds). Val Macro F1 stayed ~flat (~0.22). The notebook now uses the milder regularized set documented at the top of this file (`lr=0.04`, `min_child_samples=25`, etc.).

**Results (absolute model, current params)**  

| Config | Train RMSE | Val RMSE | Val Macro F1 | Test Macro F1 |
| --- | --- | --- | --- | --- |
| Current notebook params | 0.421 | 0.759 | 0.209 | 0.299 |

**Interpretation**  
Regularization alone did not close the gap to Persistence. Treat hyperparameter tuning as secondary to target/feature design.

**Conclusion**  
Keep the current notebook params as the shared default for absolute and delta runs, but do not expect big F1 gains from tuning alone.

---

## 4. Feature-set experiments

**Decision / Hypothesis**  
Humidity, month sin/cos, and historical local wind lags/rolls add noise more than signal for 3-month-ahead SSTA. Dropping them may match or beat the full feature model.

**Experiment**  
Absolute LightGBM; only feature subsets change. Feature-experiment cells currently use `num_boost_round=100` (not the main model's 250)—compare subsets relative to each other, not 1:1 with the main model.

| Set | # | Change |
| --- | --- | --- |
| FULL | 36 | All model features |
| TRIMMED | 23 | Drop humidity, `month_sin`/`month_cos`, local wind lags/rolls |
| PHYSICAL | 16 | Lean SSTA / basin / air-temp / current wind (no lat/lon) |

**Results (validation; absolute target)**  

| Model / Strategy | Features | Val Macro F1 | Acc | Val RMSE | Beats Persist F1? |
| --- | --- | --- | --- | --- | --- |
| Dummy | 0 | 0.133 | 0.495 | — | No |
| Persistence | 0 | **0.353** | 0.525 | 0.782 | — |
| LightGBM Full | 36 | 0.209 | 0.515 | 0.759 | No |
| LightGBM Trimmed | 23 | 0.226 | 0.520 | 0.739 | No |
| LightGBM Physical | 16 | **0.233** | 0.517 | **0.738** | No |

**Interpretation**  
Noise features are not carrying the model; TRIMMED and PHYSICAL both beat FULL slightly on Val F1/RMSE. Gains are still small vs the Persistence Macro F1 gap. No subset recovers Extreme Warm (F1 = 0).

**Conclusion**  
Prefer **TRIMMED (23)** or **PHYSICAL (16)** over FULL for absolute runs (simpler, similar or slightly better). Re-check both under the **delta** target next. FULL is optional for completeness checks only.

---

## 5. Which metrics to trust

Need both continuous skill and risk-tier skill.

**Experiment**  
Track in parallel:

- **RMSE / MAE** on reconstructed / absolute `target_ssta`  
- **Macro F1 / Accuracy** vs Dummy & Persistence (decision-relevant)

**Results**  
Lower Val RMSE did not reliably mean higher Macro F1 vs Persistence. Absolute Test Macro F1 (~0.30) can look fine while Val Macro F1 (~0.21) still fails the Persistence bar.

**Interpretation**  
Optimizing RMSE alone is insufficient for the risk-class story. Always report both; never pick a model from Test F1 without checking Val vs Persistence.

**Conclusion**  
**Primary selection rule:** improve Val Macro F1 vs Persistence, with Val RMSE as a secondary check. Use Test only as a final holdout readout.

---

## 6. Residual (delta) regression vs absolute SSTA

**Decision / Hypothesis**  
Absolute `target_ssta` regression compresses toward Neutral (L2 / regression-to-the-mean). Predicting the change from current conditions:

`delta = target_ssta − ssta`  
`pred_ssta = ssta + pred_delta`

starts the forecast at Persistence and only moves when features support a real 3-month shift.

**Experiment**  
Same LightGBM hyperparameters and full feature matrix as the main absolute model. Only the training label changes. Reconstructed absolute predictions are binned with the same NOAA thresholds.

**Results**

| Model | Val RMSE | Val Macro F1 | Test RMSE | Test Macro F1 |
| --- | --- | --- | --- | --- |
| Persistence (`ssta` / `current_risk`) | 0.782 | **0.353** | 1.212 | 0.308 |
| LightGBM absolute | 0.759 | 0.209 | 1.165 | 0.299 |
| LightGBM **delta** | **0.721** | **0.296** | **0.967** | **0.374** |

| Check | Absolute | Delta |
| --- | --- | --- |
| Val predicted SSTA range | −1.17 … +1.48 | −2.22 … +2.23 |
| Val Extreme Cool F1 | 0.000 | 0.128 |
| Val Extreme Warm F1 | 0.000 | 0.000 |
| Beats Persistence Val Macro F1? | No | No (closer: 0.296 vs 0.353) |
| Beats Persistence Test Macro F1? | No | **Yes** (0.374 vs 0.308) |

**Interpretation**  

- Delta clearly beats absolute LightGBM on Val and Test (RMSE and Macro F1).  
- Prediction range widens; absolute model remains overly cautious.  
- On **Test**, delta beats Persistence on Macro F1 and accuracy.  
- On **Val**, delta still trails Persistence Macro F1, but closes much of the gap (0.21 → 0.30).  
- Extreme Warm on val remains unsolved (only 17 support rows).

**Conclusion**  
**Prefer the residual / delta target** over absolute `target_ssta` for LightGBM going forward. Keep absolute training only as a reference baseline.

---

## 7. Best configuration to keep (for now)

| Choice | Keep |
| --- | --- |
| Task | Regression on **`target_ssta − ssta`**, reconstruct absolute SSTA, then NOAA binning |
| Algorithm | LightGBM regressor |
| Features | **TRIMMED (23)** or **PHYSICAL (16)** preferred over FULL (36) for absolute runs; re-check under delta next |
| Hyperparams | Current notebook set (`lr=0.04`, `num_leaves=8`, `max_depth=7`, …) |
| Must-beat baselines | Dummy + Persistence on **val and test** |

**Still open / investigate next**

1. Close the remaining Val Macro F1 gap to Persistence (TRIMMED/PHYSICAL + delta, sample weights, or threshold calibration).  
2. Extreme Warm recall on val (still ~0).  
3. Re-run feature-set experiments with the **delta** label so subset comparisons match the better objective.  
4. Align feature-experiment `num_boost_round` with the main model (250) so budgets stay fair.

---

## One-line summary

Residual LightGBM (`pred = ssta + Δ`) beats absolute regression and beats Persistence on **test** Macro F1, but **Persistence still leads on validation Macro F1**.

---

## Known limitations

1. Absolute predictions compress toward Neutral under L2. Val targets range about −3.45…+2.81°C; absolute preds were about −1.17…+1.48°C (delta widens to about −2.22…+2.23°C). Squared error rewards cautious central estimates; fixed tier cutoffs then miss events.  
2. Train / val / test cover different climate regimes. Extreme Warm counts: train **66**, val **17**, test **169**. Test `target_ssta` reaches **+5.60°C**, beyond the training max (**+3.93°C**). The test set has only **15** forecast months (694 site-rows), so it is especially sensitive to 1997–98.
