# EDA: Features and How They Relate

**Notebook:** `notebooks/eda_visuals.ipynb`
**Input:** `data/processed/tao-all2-train.csv` (daily) and `data/processed/features-train.csv` (monthly)
**Question:** Which features help forecast the risk class 3 months ahead?

## Summary

- **Temperature anomalies carry most of the signal.** Sea-surface and air-temperature anomalies, at the buoy and basin-wide, separate the classes 3 months ahead most clearly.
- **The wind signal is basin-wide, not local.** A buoy's own wind barely helps (mutual information ≈ 0.03). The equatorial wind in the western Pacific, however, leads the Niño 3.4 SST anomaly by about 2 months (r = 0.75) and is still r = 0.70 at the 3-month forecast horizon.
- **Recommendation:** add one wind feature (`west_pac_zwind_anom`), keep 22 features, and consider trimming 13 weak ones (35 → 23). Confirm with model results on the validation set first. See Part 8.
- **Caveats:** the training data is thin before 1986 and has few extreme months. See Limitations.

## Setup

| Decision | Why |
|---|---|
| **Training split only (1980–1993)** | EDA decides which features are kept. Looking at validation or test data here would let those years shape the model and make their scores unreliable. |
| **Raw columns, not `_scaled`** | Scaling changes units, not shape. m/s, °C and % are easier to read and present. |
| **Humidity before November 1989 set to `NaN`** | Sensors arrived in November 1989. Before that, the pipeline fills humidity with `0` (pre-1989) or a monthly average (January–October 1989, which has only 1 distinct value per month). Neither is a real reading, and both would distort every plot. 49,047 of 67,892 training rows keep humidity. |
| **Classes ordered cool → warm** | Plots read as a scale (`Extreme Cool` … `Extreme Warm`) instead of alphabetically. |

### Two datasets
| Data | Class column | Question |
|---|---|---|
| Daily `tao-all2-train.csv` | `risk_class`: the class **today** | How does the physics work? |
| Monthly `features-train.csv` | `target_risk`: the class **3 months ahead** (the model's target) | Which features help forecast? |

A feature that separates today's class only describes the present. A feature that separates `target_risk` helps forecast, which is the project's goal. (`ss_temp` and `sst_anomaly` separate today's class perfectly, but only because the class is computed from them.)

The monthly file and its features, including the basin-wide `basin_ssta`, `basin_zwind_anom`, `nino34_ssta` and `nino34_ssta_roll3`, are built by `feature_engineering.ipynb` (see `FORECAST_FEATURES.md`). Its names differ slightly from the daily data: `ssta` = `sst_anomaly`, `mer_wind_anom` = `meridional_wind_anom`.

### Data coverage
The data starts on 1980-03-07, but the buoy array was built gradually: **1 buoy in 1980, 3 in 1983, 21 in 1988, 63 in 1993.** 1993 alone has more readings than 1980–1987 combined, so most statistics describe the late 1980s and early 1990s.

## Parts 1–2: Distributions

| Variable | Mean | Min | Max | Skew | Shape | What it means |
|---|---|---|---|---|---|---|
| `zonal_wind` | −3.25 m/s | −12.2 | 12.5 | **+0.96** | Tail to the right | Mostly negative (westward trade winds). The right tail is weakened or reversed trades, a trigger of El Niño |
| `meridional_wind` | 0.69 m/s | −10.8 | 11.4 | −0.04 | Symmetric | Direction depends on hemisphere and roughly cancels out across buoys |
| `air_temp` | 26.60 °C | 17.05 | 31.48 | **−1.12** | Tail to the left | Same shape as `ss_temp`: air over the ocean follows the water |
| `ss_temp` | 27.42 °C | 17.35 | 31.09 | **−1.08** | Tail to the left | Readings pile up near a ~30 °C ceiling; the cold tail is the eastern Pacific cold tongue and La Niña |
| `humidity` | 81.44 % | 54.0 | 99.5 | +0.11 | Nearly symmetric | Tropical ocean air stays in a narrow humidity band |

How to read skew: the sign points to the long tail (positive = right, negative = left). Within ±0.5 is roughly symmetric.

**Decisions**
- **Keep the outliers.** The tails are real El Niño and La Niña conditions, which is what the model must predict.
- **No transforms.** Tree models split on thresholds, so skew doesn't affect them.
- **Use Spearman correlation in Part 4.** It uses ranks, so skew and outliers don't distort it.

## Part 3: Physical features

| Feature | Formula | Meaning |
|---|---|---|
| `wind_speed` | `sqrt(zonal_wind² + meridional_wind²)` | How hard the wind blows, regardless of direction. The raw `u`/`v` parts mix strength with direction |
| `wind_dir_to` | `(90 − degrees(arctan2(v, u))) % 360` | Compass direction the wind blows **toward** (0° N, 90° E, 180° S, 270° W). Weather reports use "from", which is +180° |
| `air_sea_diff` | `air_temp − ss_temp` | How much cooler (negative) or warmer (positive) the air is than the water. Removes the overlap between the two temperatures |
| `*_anom` | `value − average for that (site_id, month)` | How unusual a reading is for that buoy and calendar month. El Niño is defined by departures from normal |

Anomalies were computed for `zonal_wind`, `meridional_wind`, `air_temp`, `humidity`, `wind_speed` and `air_sea_diff`. (`ss_temp` already has `sst_anomaly` from the pipeline.) They use training data only, so there's no leak.

**Checks (Part 3e)**
| Check | Result |
|---|---|
| Every anomaly averages ~0 | ✅ 0.000 for all six |
| Wind direction peaks toward the west (trade winds) | ✅ Peak at 280–290°, west-northwest |
| `air_sea_diff` mostly negative (air cooler than water) | ✅ 88% of readings, median −0.76 °C |
| `zonal_wind_anom` skew vs. raw `zonal_wind` (+0.96) | +0.62: less lopsided once location and season are removed, but the wind-burst tail remains |
| `wind_speed` shape | Spike near 3.2 m/s from mean-filled wind values (see Limitations) |

**Decision:** `wind_dir_to` is for plots only, not a model feature. Direction is circular: 359° and 1° are nearly the same wind but far apart as numbers. The raw `u` and `v` already encode direction safely.

## Part 4: Redundancy (correlation and VIF)

Near-duplicate features don't hurt a tree model's accuracy, but they split feature importance between them, which makes SHAP plots misleading. Two checks:
- **Spearman correlation** compares every **pair** of features.
- **VIF** checks whether a feature can be predicted from **all the others combined**: `1 / (1 − R²)`. 1 = independent, 5 = warning, 10+ = serious.

**Strongest pairs (daily)**
| Pair | r | Why |
|---|---|---|
| `air_temp` ↔ `ss_temp` | 0.85 | Air over the ocean follows the water |
| `wind_speed` ↔ `wind_speed_anom` | 0.81 | Raw and anomaly versions of a variable overlap (0.50–0.81 for every variable) |
| `zonal_wind` ↔ `wind_speed` | −0.67 | Trade winds dominate wind speed |
| `sst_anomaly` ↔ `air_temp_anom` | 0.63 | Unusually warm water comes with unusually warm air |

All other pairs are below |0.5|.

**VIF for the temperatures** (winds and humidity stay at 1.0–1.3 in every set)
| Feature | Set A: raw | Set B: `air_sea_diff` instead of `air_temp` | Set C: all three |
|---|---|---|---|
| `air_temp` | 4.8 | — | ∞ |
| `ss_temp` | 5.2 | 1.8 | ∞ |
| `air_sea_diff` | — | 1.6 | ∞ |

Set C is infinite because `air_temp = ss_temp + air_sea_diff` exactly. The heatmap can't show this: `air_sea_diff`'s strongest single pairing is only −0.63. That's why both checks are needed.

**Decisions**
1. **Raw `air_temp` duplicates `ss_temp`.** Wherever raw daily values are used, keep `ss_temp` + `air_sea_diff` instead of `air_temp`. This does **not** apply to `air_temp_anom`, the monthly forecast feature, which Part 5 shows is one of the best predictors.
2. **Never use all three temperatures together.**
3. **One version per variable, raw or anomaly, not both.** Prefer the anomaly. The forecast features are anomalies.
4. **Raw `air_temp` stays in the cleaned data.** `air_sea_diff` and `air_temp_anom` are both built from it.

## Part 5: Class separation (violin plots)

A feature is useful if its values shift as the classes go from cool to warm.

| Feature | Today's class (daily medians) | 3 months ahead (monthly medians) |
|---|---|---|
| `air_temp_anom` | **Strong**: −1.87 → +1.53 °C | **Strong**: −1.13 → +0.88 °C |
| `ssta` / `nino34_ssta` | (defines the class) | **Strong**: −1.42 → +1.30 / −1.81 → +0.82 °C |
| `air_sea_diff_anom` | Moderate: +0.26 → −0.52 °C | (not in monthly file) |
| `meridional_wind_anom` | Weak: −0.52 → +0.52 m/s | Weak: −0.18 → +0.47 m/s |
| `zonal_wind_anom` | None | None |
| `wind_speed_anom`, humidity | None | None |

**Decisions**
- **Keep `air_temp_anom`.** It is one of the clearest separators 3 months ahead.
- **Local zonal wind shows no separation**, even though weakened trade winds drive El Niño. Parts 6–7 explain why: the signal is basin-wide.

## Part 6: Mutual information

Mutual information (MI) measures how much a feature tells you about the class 3 months ahead. Unlike correlation, it also catches curved and threshold relationships. A column of random numbers gives the noise level (MI = 0.001).

| Tier | Features | MI |
|---|---|---|
| Top | `nino34_ssta_roll3`, `basin_ssta`, `nino34_ssta`, `basin_zwind_anom` | 0.27–0.29 |
| Strong | `ssta`, `ssta_roll3`, `air_temp_anom`, `ssta_lag1`, `ssta_roll6`, `air_temp_anom_lag1` | 0.14–0.23 |
| Moderate | longer SST and air-temp lags, `ssta_change3`, `lon`, `lat` | 0.05–0.14 |
| Weak | local zonal and meridional wind anomalies (all lags) | 0.01–0.04 |
| ≈ Noise | `month_sin`, `month_cos`, `humidity` | < 0.01 |

**Decisions**
- **The wind signal is basin-wide.** `basin_zwind_anom` ranks 4th, while every local zonal wind feature is near the bottom.
- **Location matters, just not in a straight line.** `lon` has MI 0.10 but correlation −0.02: the east and west Pacific behave differently. Keep `lat` and `lon`.
- **`humidity`, `month_sin` and `month_cos` are drop candidates** (see Part 8).

## Part 7: Wind deep-dive

**Hovmöller diagram:** wind and SST anomalies along the equator, longitude × time. Known events are visible (1987 El Niño, 1988–89 La Niña, 1991–92 El Niño), and bands of weakened trade winds line up with, or come just before, warm SST at the same longitudes. Coverage is patchy before 1986 (see Limitations).

**Lead time:** correlation between the western Pacific equatorial wind anomaly (140°E–180°) and the Niño 3.4 SST anomaly, with the wind shifted *k* months earlier.

| k (months the wind leads) | −3 | 0 | 1 | **2** | 3 | 4 | 6 |
|---|---|---|---|---|---|---|---|
| r | 0.66 | 0.72 | 0.73 | **0.75** | 0.70 | 0.62 | 0.48 |

The correlation peaks with the wind **2 months ahead** and is still 0.70 at the 3-month forecast horizon. It's also high when SST comes first (wind and SST reinforce each other), so the 2-month edge is modest, not proof of cause.

**Why local wind is weak:** the early-warning wind is in the **west**, while most warming shows up in the **east**. A buoy's own wind misses that pattern.

## Part 8: Final recommendations

**Last check:** do the new candidate features help forecast?
| Feature | MI | Spearman vs `target_ssta` | Verdict |
|---|---|---|---|
| `west_pac_zwind_anom` (new) | **0.282** | **0.413** | Best wind feature → **add** |
| `basin_zwind_anom` (existing) | 0.273 | 0.324 | Keep |
| `air_sea_diff_anom` (new) | 0.042 | −0.157 | Separates today's class (Part 5) but not the class 3 months ahead → don't add |
| `zonal_wind_anom` (existing, local) | 0.035 | 0.079 | Weak |

**Feature list for `FEATURES` in `feature_engineering.ipynb`**
| Decision | Features | Why |
|---|---|---|
| **Add** (1) | `west_pac_zwind_anom`: equatorial (2°S–2°N) zonal wind anomaly averaged over 140°E–180°, one value per month | Best wind feature; leads Niño 3.4 SST (Part 7) |
| **Keep** (20) | `ssta`, `ssta_lag1/2/3/6`, `ssta_roll3/6`, `ssta_change1/3`, `basin_ssta`, `nino34_ssta`, `nino34_ssta_roll3`, `basin_zwind_anom`, `air_temp_anom`, `air_temp_anom_lag1/2/3/6`, `lat`, `lon` | Top MI tiers and clear class separation |
| **Keep, current month only** (2) | `zonal_wind_anom`, `mer_wind_anom` | Weak but above noise |
| **Trim candidates** (10) | `zonal_wind_anom_lag1/2/3/6`, `zonal_wind_anom_roll3/6`, `mer_wind_anom_lag1/2/3/6` | Little signal; extra columns add overfitting risk with ~2,000 training rows |
| **Drop candidates** (3) | `humidity`, `month_sin`, `month_cos` | MI at noise level |
| **Don't add** | `air_sea_diff_anom`, `wind_speed_anom`, `wind_dir_to` | No forecast signal / no class separation / circular |

**Potential result: 35 → 23 features**, if all trims and drops are confirmed.

**Before applying**
1. **Confirm with the model.** Compare Macro F1 on the **validation** set (never test) for the current 35 features, 35 + `west_pac_zwind_anom`, and the recommended 23. Every version must beat the persistence baseline (0.353).
2. **Explain the model by feature family** (buoy SST, basin SST, wind, air temperature, location). The top SST features are near-duplicates (r 0.83–0.95), so single-feature SHAP values would be split and misleading.
3. **Apply in one change:** update `FEATURES` in `feature_engineering.ipynb` (adding `west_pac_zwind_anom` next to the other basin-wide features), then update `FORECAST_FEATURES.md`.

## Limitations and open questions

- **Thin early coverage.** The western Pacific has wind data only from mid-1986 (92 of 154 months), and the 1982–83 El Niño is seen by only 2–3 eastern buoys.
- **Few extreme months.** The monthly training data has only 66 Extreme Warm and 90 Extreme Cool rows, so results for those classes are noisier. This matters for class weights at modeling time.
- **Basin-wide features are probably over-scored.** Each has one value per month (143 unique values) shared by all buoys, so part of its MI reflects *which month* it is.
- **MI scores one feature at a time.** It can't see combinations such as season × SST (El Niño tends to peak in November–January), which is why drops need model confirmation.
- **Humidity interactions** (from the task brief) were not built, because humidity alone scored at noise level. That's reasoning, not a test.
- **Mean-filled wind and air temperature (pipeline issue, but does not affect EDA results - tested).** The cleaning pipeline fills longer sensor gaps with one Pacific-wide average per calendar month, so every filled row in a given month gets the same value at every buoy (e.g. all filled December rows have `u = −3.34`, `v = 0.11`). This affects **8,700 training rows (12.8%) for wind** (up to 40% in 1985) and about 5,500 for air temperature, and shows as the spike in the `wind_speed` histogram. Likely cause: filling happens in pipeline Step 2, before `site_id` exists (Step 4), so there was no site to group by.
  - *Effect on this EDA (tested):* filled values pile up at the average, so wind looks less variable than it is (std 3.12 vs. 3.34 m/s on real readings only). **Conclusions don't change:** with filled rows removed, local zonal wind still doesn't separate the classes (correlation with SST anomaly 0.03 → 0.05). SST findings are unaffected, since rows with missing SST are dropped, never filled.
- **1989 humidity (pipeline issue).** January–October 1989 humidity is entirely mean-filled (1 distinct value per month), because the pipeline and `feature_engineering.ipynb` use `year >= 1989` instead of November 1989. This EDA hides (NaN) those months; the pipeline and monthly file still include them.
