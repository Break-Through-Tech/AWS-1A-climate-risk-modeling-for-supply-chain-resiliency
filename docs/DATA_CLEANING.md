# Data Cleaning Overview 

| Dataset | Script | Pre-Cleaning Shape | Post-Cleaning Shape | Rows Dropped | Columns Transformed / Dropped |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TAO Buoys** | `clean_taoall2.py` | `(178080, 12)` | `(161073, 12)` | 17,007 rows (~9.55%) | Dropped raw `date`; Added `standardized_date` |
| **El Niño** | `clean_elnino.py` | `(782, 9)` | `(709, 9)` | 73 rows (~9.34%) | 0 columns dropped (all 9 preserved) |


## Tao Dataset 

`scripts/clean_taoall2.py` performs the following:

1. Raw Date Formatting: The original `date` column stored timestamps as 6-digit integers in `YYMMDD` format (e.g., `800405`).
  * Converted `date` into standard datetime format: (`YYYY-MM-DD`).
  * Extracted a verified 4-digit `year` column for quick parsing.
  * Dropped the obsolete raw `date` column.

2. (`ss_temp`) Handling
  * Dropped rows with null values for `ss_temp`
    **Impact:** 17001 rows dropped (161,073 clean rows).
    **Reasoning:** (`ss_temp`) is the key predictor for calculating Sea Surface Temperature Anomalies (SSTAs). Imputing artifical data would diminish the machine learning model's prediction accuracy, while also invalidate future evaluation metrics. 

3. Atmospheric Column (`zonal_wind`, `meridional_wind`, `air_temp`).
  * Handled short sensor dropouts using temporal continuity with a forward fill limit of 3 days and backward fill limit of 1 day.
  * For extended outages, filled remaining missing values using seasonal monthly averages calculated across all records.

4. Null Humidity Value Handling
  * **Post-1989 Records:** Occasional sensor dropouts were imputed using seasonal monthly averages. 
  * **Pre-1989 Records:** Physical sensors were not deployed prior to November 1989. To represent this structural absence without incorrectly filling in column values, missing values prior to 1989 were explicitly mapped to `0`.



## El Nino Dataset

`clean_elnino.py` performs the following: 

1. (`ss_temp`) Handling
  * Dropped rows with null values for `ss_temp`.
    **Impact:** 73 rows dropped (from 782 down to 709).
    **Reasoning:** Same as above; protects the validity of model evaluation. 

2. Sensor Assignment Per Mooring
  **Features:** `zonal_wind`, `meridional_wind`, `air_temp`, `humidity`.
    * To ensure data from one mooring station does not leak into another, transient gaps were filled sequentially per buoy using `.groupby('buoy')[features].ffill(limit=3).bfill(limit=1)`.
    * For extended outages, remaining missing values were filled with the overall dataset column mean.