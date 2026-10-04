# Feature Engineering

Step 6 of `notebooks/data_cleaning_preprocessing_pipeline.ipynb` adds time-series features built from each buoy's own past sea surface temperature (`ss_temp`). It runs after target derivation (Step 5) and before chronological splitting (Step 7).

## Features Added

| Feature         | Meaning                                          | `tao-all2` | `elnino` |
| :-------------- | :----------------------------------------------- | :--------- | :------- |
| `temp_lag_7`    | `ss_temp` exactly 7 days earlier                 | No         | Yes      |
| `temp_mean_7d`  | Mean `ss_temp` over the previous 7 days          | No         | Yes      |
| `temp_std_7d`   | Std. dev. of `ss_temp` over the previous 7 days  | No         | Yes      |
| `temp_lag_30`   | `ss_temp` exactly 30 days earlier                | Yes        | No       |
| `temp_mean_30d` | Mean `ss_temp` over the previous 30 days         | Yes        | No       |
| `temp_std_30d`  | Std. dev. of `ss_temp` over the previous 30 days | Yes        | No       |
| `temp_lag_90`   | `ss_temp` exactly 90 days earlier                | Yes        | No       |
| `temp_mean_90d` | Mean `ss_temp` over the previous 90 days         | Yes        | No       |
| `temp_std_90d`  | Std. dev. of `ss_temp` over the previous 90 days | Yes        | No       |

## Thought Process

1. **Why past temperature?**

- El Niño and La Niña build up over weeks. Recent water temperature, its trend, and its volatility are strong signals of where the anomaly is heading.
- **Lag** captures where the temperature was, **mean** captures the recent level, and **std** captures how unstable the readings have been.

2. **Why 30 and 90 days for `tao-all2`, and 7 days for `elnino`?**

- 30 days captures the monthly build-up typical of ENSO events; 90 days captures the seasonal (three-month) scale used by NOAA's Oceanic Niño Index.
- `elnino` only spans 14 days, so 30- and 90-day windows can never fill. It keeps 7-day features only.

3. **Grouping by `buoy_segment_id` and `site_id`**

- Features are computed separately for each buoy deployment at each mooring site, so one buoy's history never leaks into another's.

4. **No look-ahead (leak-free)**

- Rolling windows use `closed='left'`, so the current day's reading is excluded from its own window. Only past data is used.
- Lags are looked up by **calendar date** (`date - 30 days`, `date - 90 days`), not by row position. If that exact date is missing in the same buoy segment, the lag is `NaN`; the nearest date or previous row is never substituted.

5. **Calendar windows and minimum coverage**

- Windows span calendar days (`'30D'`, `'90D'`), not a fixed number of rows. Missing dates are never created or filled; only readings that actually exist inside the window are used.
- Both rolling means and stds require at least 70% coverage of their window. With fewer readings, both are `NaN`.

| Window  | Coverage | Minimum readings   |
| :------ | :------- | :----------------- |
| 30-day  | 70%      | 30 × 0.70 = **21** |
| 90-day  | 70%      | 90 × 0.70 = **63** |

6. **Gaps are left as `NaN`**

- There are 1,708 gaps in `tao-all2` and 0 in `elnino`.
- The start of each deployment is also `NaN`, since there is no earlier history yet: the first 30 days for `temp_lag_30`, the first 90 days for `temp_lag_90`, the first 21 readings for `temp_mean_30d` and `temp_std_30d`, and the first 63 readings for `temp_mean_90d` and `temp_std_90d`.
