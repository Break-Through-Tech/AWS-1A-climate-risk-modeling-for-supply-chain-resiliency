# Feature Engineering: Monthly Forecast Features and 3-Month-Ahead Target

**Notebook:** `notebooks/feature_engineering.ipynb`
**Input:** `data/processed/tao-all2-{train,val,test}.csv` (from `data_cleaning_preprocessing_pipeline.ipynb`)
**Output:** `data/processed/features-{train,val,test}.csv`

## Why this step exists

The cleaned data labels each day with that same day's `risk_class`, and `ss_temp` is also a column. A model trained on it can read the answer straight off the row, so it would score well while giving no advance warning. The project goal is months of lead time. This step builds a **future target** and features that only use information available at prediction time.

## Decisions

### 1. Climatology recomputed from training years only
The pipeline's `monthly_clim` averages all 18 years, including the 1997–98 test period, so test information leaks into every anomaly. Here the baseline for each `(site_id, calendar month)` uses **1980–1993 only**. The same approach gives anomalies for zonal wind, meridional wind, and air temperature.

Site/month pairs never observed before 1994 have no baseline and are dropped (13,362 daily rows, mostly sites that came online later).

### 2. Pre-1989 humidity set back to missing
The pipeline fills humidity with `0` before sensors existed (1989). 0% humidity is physically impossible over the ocean and a tree model would treat it as a real value, so these become `NaN`. LightGBM handles missing values natively.

### 3. Daily readings aggregated to monthly, per site
ENSO develops over months, and daily readings are noisy and heavily autocorrelated. Each row is one `site_id` in one month. Missing months are inserted as empty rows so that `shift(1)` always means "one calendar month ago", even across sensor outages.

Result: 6,571 site-months, 971 of which are gaps.

### 4. Target: risk class 3 months ahead
`target_ssta` is the monthly anomaly `LEAD_MONTHS = 3` months later at the same site. `target_risk` applies the same 5 NOAA tiers the pipeline uses. Both are kept, so the team can model this as classification or regression.

### 5. Features (35), all backward-looking and grouped by site

| Group | Features |
|---|---|
| Current state | `ssta`, `zonal_wind_anom`, `mer_wind_anom`, `air_temp_anom`, `humidity` |
| Lags | each anomaly at 1, 2, 3, 6 months back |
| Trends | 3- and 6-month trailing means of `ssta` and `zonal_wind_anom`; 1- and 3-month change in `ssta` |
| Basin-wide | mean `ssta` and zonal wind anomaly across all sites; mean `ssta` in the Niño 3.4 box (5°S–5°N, 170°W–120°W) and its 3-month mean |
| Season | `month_sin`, `month_cos` |
| Location | `lat`, `lon` |

These complement the daily 30- and 90-day `ss_temp` lag/rolling features in the cleaning pipeline (see `DATA_FEATURE_ENGINEERING.md`). Those describe each buoy's recent temperature history; the features here add wind, regional, and seasonal signals and a forecast target.

### 6. Split with a gap at each boundary
Same year boundaries as the pipeline (train ≤1993, val 1994–96, test 1997–98). The last 3 months of train and of val are dropped, because their targets fall in the next split.

| Split | Rows | Months |
|---|---|---|
| Train | 1,988 | 1980-08 to 1993-09 |
| Val | 1,529 | 1994-01 to 1996-09 |
| Test | 694 | 1997-01 to 1998-03 |

## Validation results

**Strongest correlations with `target_ssta` (train):** `ssta` 0.65, `basin_ssta` 0.60, `ssta_roll3` 0.59, `nino34_ssta` 0.56, `ssta_lag1` 0.55, `air_temp_anom` 0.54.

**Baselines on validation (Macro F1):**

| Baseline | Macro F1 |
|---|---|
| Always "Neutral" | 0.13 |
| Persistence (class in 3 months = class now) | **0.35** |

Models should be compared against the persistence baseline.


