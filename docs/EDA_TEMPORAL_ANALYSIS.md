# EDA: Target and Temporal Analysis

**Notebook:** `notebooks/eda_temporal_analysis.ipynb`  
**Inputs:** `data/processed/tao-all2-train.csv`, `tao-all2-val.csv`, `tao-all2-test.csv` (daily); `data/processed/features-train.csv` (monthly)  
**Question:** How do climate-risk labels and ocean temperatures change over time, and which existing temporal features may help forecast SSTA three months ahead?

## Summary

- **Risk classes are imbalanced and change across time.** Neutral represents 57.75% of valid training labels, while Extreme Warm represents 3.95%. Extreme Warm rises to 20.71% in the test split, indicating a substantial shift in the observed class distribution.
- **SSTA reflects recognizable historical patterns.** Monthly average anomalies show warming around 1982–83 and 1997–98 and cooling around 1988–89. These patterns are consistent with the timing of major ENSO events, although the plot is not an official ENSO index.
- **SST has a seasonal pattern.** Average SST rises toward March–May and falls later in the year; the pattern varies in magnitude across buoy sites.
- **Recent anomalies carry the strongest temporal signal.** Aggregate monthly SSTA autocorrelation is 0.901 at one month and 0.724 at three months. In the monthly training features, current SSTA and the three-month rolling mean have the strongest observed correlations with future SSTA among the tested local SSTA features.
- **Air temperature is more strongly correlated with future SSTA than local wind.** Current air-temperature anomaly correlates at 0.541, while tested local wind anomalies have correlations close to zero.
- **Recommendation:** Keep the existing short-term SSTA, rolling, air-temperature, and cyclical-month features as candidates; test longer lags and wind features through model validation rather than dropping them based on pooled correlations alone.

## Setup and scope

| Dataset | Label / target | Purpose |
|---|---|---|
| Daily TAO train, validation, test | `risk_class`, `sst_anomaly` | Examine class balance, historical anomalies, seasonality, and coverage |
| Monthly `features-train.csv` | `target_ssta` (future SSTA), `target_risk` (future risk) | Examine relationships between existing engineered features and the forecasting target |

The daily splits cover **1980–1993 (training)**, **1994–1996 (validation)**, and **1997–1998 (testing)**. Class distributions across splits and years were examined descriptively to understand temporal changes. **Feature-to-target correlations were calculated on the monthly training split only**, so validation and test outcomes were not used to rank candidate features.

The five risk classes are **Extreme Cool**, **Moderate Cool**, **Neutral**, **Moderate Warm**, and **Extreme Warm**. These are labels based on local buoy SSTA thresholds, not official ENSO phase classifications.

## Part 1: Target distribution and missing labels

### Training class balance

| Risk class | Training observations | Share of valid training labels |
|---|---:|---:|
| Extreme Cool | 3,601 | 5.30% |
| Moderate Cool | 9,876 | 14.55% |
| Neutral | 39,209 | 57.75% |
| Moderate Warm | 12,521 | 18.44% |
| Extreme Warm | 2,685 | 3.95% |

Neutral is the majority class, while both extreme classes are relatively uncommon. A model that performs well on Neutral may still perform poorly on the extremes, so **Macro F1 and per-class recall/F1** should be included in evaluation.

### Class distribution across chronological splits

Percentages below exclude missing risk labels.

| Risk class | Training | Validation | Testing |
|---|---:|---:|---:|
| Extreme Cool | 5.30% | 8.82% | 2.56% |
| Moderate Cool | 14.55% | 24.91% | 17.18% |
| Neutral | 57.75% | 46.78% | 40.50% |
| Moderate Warm | 18.44% | 17.99% | 19.05% |
| Extreme Warm | 3.95% | 1.50% | 20.71% |

The largest shift is **Extreme Warm**, increasing from 3.95% in training to 20.71% in testing. This is consistent with the timing of the strong 1997–98 El Niño, but site coverage and sampling differences could also affect the proportions. Chronological evaluation is important because the model must generalize to climate conditions unlike those most common in training.

### Missing risk labels

| Split | Missing `risk_class` | Share of split |
|---|---:|---:|
| Training | 0 | 0% |
| Validation | 8,567 | 13.68% |
| Testing | 4,795 | 15.69% |

All missing labels in validation and testing coincide with missing `sst_anomaly` and `monthly_clim`, **not missing observed SST**. The pipeline calculates climatology from the training period only; site/month combinations without an available training baseline cannot receive an anomaly or risk label. This avoids using future periods to calculate baselines, but reduces labeled evaluation coverage.

### Yearly class distributions

Yearly class proportions vary considerably. Extreme Warm becomes especially noticeable during **1982–83** and **1997–98**, while cooling classes are more prominent in some other years. Because buoy coverage and observation counts vary over time, these are **descriptive patterns**, not direct measurements of ENSO intensity.

**Implications:** Use per-class metrics, preserve chronological splits, and account for missing labels and changing site coverage when interpreting performance.

## Part 2: SSTA sanity check and temporal coverage

SSTA is calculated as:

`sst_anomaly = observed SST − site/month historical climatology`

The monthly average across available TAO observations moves above and below zero. The plot shows:

- Strong positive anomalies around **1982–83**.
- A pronounced cooling period around **1988–89**.
- Renewed warming around **1997–98**.

These timings are consistent with known El Niño and La Niña periods. However, **the average pools observations from different sites**, so changing buoy coverage can affect its level. It should not be treated as the Niño 3.4 index.

### Missing months

The monthly SSTA series contains **12 months without a valid monthly average**. In particular, **May–September 1983** have zero observations and zero valid SSTA values; April 1983 has 50 observations and October has 11. The visible break in the time-series graph is therefore a **data-coverage gap**, not an anomaly-calculation failure.

**Implications:** Do not interpolate these gaps without justification or treat consecutive observed months as necessarily consecutive calendar months. Monthly means with very different observation counts should be interpreted cautiously.

## Part 3: Seasonality

The overall average raw SST rises from January to a peak around **April–May** (approximately 28.3°C), declines toward August, and remains comparatively stable later in the year. The five most-observed sites show similar early-year warming, although their temperature ranges and peak timing differ.

This supports investigating seasonal information and site/location effects. The monthly engineered dataset **already includes `month_sin` and `month_cos`**, so no new month encoding is required based on this analysis alone. Note that **raw SST seasonality does not imply the same seasonal cycle remains in SSTA**, because SSTA subtracts a site/month baseline.

**Implication:** Retain cyclical month features as candidates, then assess their incremental value during model validation.

## Part 4: Autocorrelation and existing SSTA features

### Monthly SSTA autocorrelation

This calculation uses the monthly **average across available buoy observations**, retaining missing calendar months in the time index.

| Lag | Autocorrelation |
|---|---:|
| 1 month | 0.901 |
| 2 months | 0.795 |
| 3 months | 0.724 |
| 4 months | 0.630 |
| 5 months | 0.526 |
| 6 months | 0.384 |
| 8 months | 0.042 |
| 12 months | −0.280 |

The relationship is strongest at short lags and generally weakens with time. This supports investigating recent conditions as predictors, but aggregate autocorrelation may be affected by changing site coverage and cannot establish predictive performance at an individual buoy.

### Existing engineered features versus future SSTA

The following are **Pearson correlations with `target_ssta` in `features-train.csv`**, not autocorrelation values:

| Existing feature | Correlation with `target_ssta` |
|---|---:|
| `ssta` | 0.648 |
| `ssta_roll3` | 0.586 |
| `ssta_lag1` | 0.548 |
| `ssta_roll6` | 0.475 |
| `ssta_lag2` | 0.448 |
| `ssta_lag3` | 0.347 |
| `ssta_lag6` | 0.077 |

Current SSTA, the three-month rolling mean, and the one-month lag show the strongest relationships among the features tested. The six-month lag has little *individual linear* correlation, but may still be useful in a nonlinear model or in combination with other features.

**Implication:** Prioritize testing short-term SSTA and rolling features; use validation experiments to decide whether longer lags contribute incremental value.

## Part 5: Air-temperature and wind lead-time relationships

Correlations below also use the **monthly training dataset** and the future `target_ssta` outcome.

| Feature | Correlation with `target_ssta` |
|---|---:|
| `air_temp_anom` | 0.541 |
| `air_temp_anom_lag1` | 0.466 |
| `air_temp_anom_lag2` | 0.389 |
| `air_temp_anom_lag3` | 0.317 |
| `air_temp_anom_lag6` | 0.146 |
| `zonal_wind_anom` | 0.086 |
| `mer_wind_anom` | 0.066 |

Other tested local zonal and meridional wind lags were also weak (approximately **−0.044 to +0.064**). Recent air-temperature anomalies therefore show substantially stronger **pooled linear** relationships with future SSTA than the tested local wind features.

This does **not** establish that wind has no predictive value. Wind effects may be spatially distributed, nonlinear, or better represented by basin-wide features; those relationships were not evaluated in this notebook.

**Implication:** Keep recent air-temperature anomalies high on the evaluation list and test wind features through model comparisons before removing them.

## Final recommendations

| Recommendation | Evidence | Next action |
|---|---|---|
| Evaluate minority-class performance | Neutral dominates training; extremes vary across splits | Report Macro F1 and per-class metrics for `target_risk` |
| Preserve chronological evaluation | Risk distributions shift markedly across years | Use the existing time-based splits |
| Prioritize recent SSTA features | `ssta`, `ssta_roll3`, and `ssta_lag1` have the strongest tested SSTA-feature correlations | Compare model performance with and without feature groups |
| Test whether long lags help | `ssta_lag6` has correlation 0.077 | Assess incremental validation performance before trimming |
| Evaluate recent air-temperature features | `air_temp_anom` correlates at 0.541, with weaker relationships at longer lags | Keep as candidate predictors |
| Keep seasonality features as candidates | Raw SST follows a calendar-month pattern | Evaluate existing `month_sin` and `month_cos` |
| Do not drop local wind solely on correlation | Pooled linear relationships are weak | Compare wind/no-wind models; consider spatial context |
| Interpret temporal aggregates cautiously | Missing months and changing buoy coverage | Check coverage when explaining trends |

## Limitations and open questions

- **Uneven spatial and temporal coverage:** Buoy sites and observation counts change over time. Aggregated monthly means and correlations may partly reflect sampling differences.
- **Missing periods:** Twelve months have no valid pooled monthly SSTA average; May–September 1983 have no observations at all.
- **Incomplete evaluation labels:** Some validation/test site-month combinations lack a training-derived climatology baseline, so their target classes are missing.
- **Pooled versus site-specific relationships:** The autocorrelation analysis uses basin-spanning monthly averages, while the feature correlations pool site-month rows. Neither is a substitute for within-site forecasting evaluation.
- **Correlation is not feature importance:** A weak individual Pearson correlation does not rule out nonlinear, interaction, or geographically specific predictive value.
- **Forecast alignment:** This report uses the existing `target_ssta` and `target_risk` fields as defined by the team's feature-engineering pipeline; it does not independently audit their forecast horizon or feature timing.
- **Exploratory versus final decisions:** Recommendations should be confirmed against a baseline model on the validation split, not by selecting features using the test split.

**Bottom line:** The analysis supports focusing model experiments on **recent SSTA, rolling averages, and recent air-temperature anomalies**, while retaining seasonal and wind features as testable candidates and evaluating performance across all climate-risk classes.

