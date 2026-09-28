# Data Standardization, Normalization, and Partitioning

## 1. Executive Summary & Pipeline Flow

This document details the data engineering, buoy identification, spatial binning, chronological partitioning, and normalization decisions applied to the raw Tropical Atmosphere Ocean (TAO) and El Niño datasets. 

The primary objective is to transform raw, noisy, drifting sensor readings from the equatorial Pacific into clean, leak-free, standardized partitions ready for **Feature Engineering** and **Machine Learning Modeling (Gradient Boosted Trees)**.

```
[Raw data/el+nino.zip]
        │
        ▼ (Stage 1: Ingestion & Missing Sensor Handling)
[Cleaned Sensor Logs]
        │
        ▼ (Stage 2: Continuous Buoy Tagging by Date Discontinuities)
[73 Continuous Buoy Deployments (buoy_segment_id)]
        │
        ▼ (Stage 3: Spherical Haversine Binning to NOAA Grid)
[70 Official Mooring Stations (site_id)]
        │
        ▼ (Stage 4: Target Variable Derivation: Baseline & SSTA)
[Climate Risk Labeled Targets (sst_anomaly, risk_class)]
        │
        ▼ (Stage 5: Chronological Train / Val / Test Partitioning)
        │
        ▼ (Stage 6: Leak-Free Z-Score Standardization)
[Final Machine-Learning Partitions]
   ├── tao-all2-train.csv (67,892 rows, 1980–1993)  ├── elnino-train.csv (475 rows)
   ├── tao-all2-val.csv   (62,620 rows, 1994–1996)  ├── elnino-val.csv   (101 rows)
   └── tao-all2-test.csv  (30,561 rows, 1997–1998)  └── elnino-test.csv  (133 rows)
```

---

## 2. Stage 1: Buoy Deployment Tagging (`buoy_segment_id`)

### The Problem
In the primary dataset (`tao-all2`), observations are stacked sequentially buoy-by-buoy from 1980 to 1998, but the dataset contains no column identifying individual buoys. Without an explicit instrument identifier, applying time-series operations (such as forward-fills, rolling statistics, or lag features) would leak data across buoy boundaries—e.g., the final December 1998 reading of Buoy #1 would bleed into the first March 1980 reading of Buoy #2.

### Choices Weighed
* **Option A: Group by raw GPS coordinates (latitude/longitude).**
  * *Drawback:* Flawed because buoys sway within a ~15 km watch circle, producing over 8,500 distinct coordinate pairs.
* **Option B: Detect changes in calendar year.**
  * *Drawback:* Flawed because several buoy deployments begin in the same calendar year that the previous deployment ended (e.g., November to April of the same year), causing multiple buoys to merge into one.
* **Option C: Detect backward date jumps on full timestamps.**
  * *Selected:* Whenever the date difference is negative (`date[i] - date[i-1] < 0`), a new deployment has begun.

### Implementation & How It Works in Simple Terms
We convert the date string into a datetime object, check where the date goes backward in time, and use `.cumsum()` to assign an incremental integer identifier:

```python
date_dt = pd.to_datetime(df['standardized_date'])
is_new_buoy = date_dt.diff() < pd.Timedelta(days=0)
df['buoy_segment_id'] = is_new_buoy.cumsum()
```

### Result
* **`tao-all2`**: Exactly **73 unique buoy deployments** (IDs `0` through `72`).
* **Validation against ground truth:** Official NOAA PMEL documentation states: *"The TAO array consists of nearly 70 moored buoys spanning the equatorial Pacific."* In the raw archive, there are 76 deployments; 3 deployments had 100% missing sea surface temperature sensors and were dropped during initial cleaning, leaving exactly 73 valid continuous records.
* **`elnino` (sample dataset)**: Already contains an explicit `buoy` column (`1` through `54`), which was mapped directly to `buoy_segment_id`.

---

## 3. Stage 2: Mooring Site Binning (`site_id`)

### The Problem
Deep-ocean buoys are anchored to the seafloor with ~4,000 meters of steel cable. Surface currents and winds cause buoys to sway inside a "watch circle" (~15 km radius). Furthermore, buoys were retrieved, serviced, and redeployed over the 18-year period. Consequently, the dataset contains over 8,500 distinct coordinate pairs for fixed ocean stations. Grouping on raw coordinates produces thousands of fragmented groups with tiny sample sizes.

### Choices Weighed
* **Option A: Naive 1D flat Euclidean snapping (min distance on lat and lon independently).**
  * *Drawback:* Catastrophic failure at the International Date Line / Antimeridian (-180° / +180°). In flat 1D math, a buoy at -179.89° longitude is mathematically 9.9° away from -170°, but 359.9° away from +180°. It incorrectly snaps to -170° (over 1,100 km away!) instead of +180° (only 12 km away!). This caused over 10,800 misclassifications.
* **Option B: Unsupervised Clustering (DBSCAN / K-Means).**
  * *Drawback:* Produces arbitrary cluster numbers that have no geographic meaning or alignment with peer-reviewed NOAA literature.
* **Option C: Spherical Great Circle (Haversine) distance to official NOAA mooring stations.**
  * *Selected:* Uses the official 70 mooring station coordinates from NOAA PMEL (McPhaden et al., 1998) and calculates true spherical distance, correctly wrapping around the -180° / +180° seam.

### How It Works in Simple Terms
Earth is a sphere, so longitude wraps in a circle. We compute the true curved surface distance in kilometers from each drifting coordinate to all 70 official NOAA mooring stations. Each reading is assigned to its closest physical anchor station.

```python
# Identifier format: [nominal_latitude]_[nominal_longitude]
site_id = f"{int(nominal_latitude)}_{int(nominal_longitude)}"
```

### Format Breakdown:
* **`0_-110`**: Mooring station on the Equator (0° latitude) at 110°W longitude (negative numbers represent Western longitudes).
* **`5_165`**: Mooring station at 5°N latitude, 165°E longitude (positive numbers represent Northern latitudes and Eastern longitudes).
* **`-2_-140`**: Mooring station at 2°S latitude, 140°W longitude.
* **`0_180`**: Mooring station on the Equator at 180° longitude (the Date Line).

### Result
* All 161,073 rows mapped cleanly into **70 official NOAA mooring stations**.
* Median drift distance from raw GPS to assigned station: **14.4 km** (matching the physical mooring cable watch circle).

---

## 4. Stage 3: Target Variable Derivation (SST Anomalies & Climate Risk)

### The Problem
The raw data contains water temperature in degrees Celsius (`ss_temp`). However, El Niño and La Niña are not defined by warm or cold water in an absolute sense—they are defined by **departures from normal (anomalies)** for that specific location and time of year. Summer water is naturally warmer than winter water; western Pacific water is naturally warmer than eastern Pacific water.

### Choices Weighed
* **Option A: Normalize by each individual year's average.**
  * *Drawback:* Destroys the El Niño signal! If 1997 is 3°C hotter than normal, subtracting 1997's average makes 1997 look "normal" (`0.0`). The model would be completely blind to major climate shocks.
* **Option B: Subtract a single global average across all buoys.**
  * *Drawback:* Ignores that the Western Pacific Warm Pool is naturally 5°C warmer than the Eastern Pacific Cold Tongue.
* **Option C: Calculate site-specific monthly climatological baselines.**
  * *Selected:* Compute the historical average temperature for each physical mooring station in each calendar month:
    ```
    monthly_clim = average ss_temp for [site_id, calendar_month] across historical baseline
    sst_anomaly = ss_temp - monthly_clim
    ```

### Risk Classification Thresholds
To satisfy the project requirement of predicting rare, high-impact climate anomalies evaluated via Macro F1-score, we mapped continuous anomalies into standard NOAA Oceanic Niño Index (ONI) tiers:
* **Extreme Warm (Strong El Niño Risk):** anomaly >= +1.5°C (5.6% of data)
* **Moderate Warm (El Niño Alert):** +0.5°C <= anomaly < +1.5°C (17.2% of data)
* **Neutral (Normal Baseline):** -0.5°C < anomaly < +0.5°C (52.6% of data)
* **Moderate Cool (La Niña Alert):** -1.5°C < anomaly <= -0.5°C (19.4% of data)
* **Extreme Cool (Strong La Niña Risk):** anomaly <= -1.5°C (5.3% of data)

---

## 5. Stage 4: Dataset Partitioning (Chronological Splitting)

### The Problem
Standard random train/test splits (`train_test_split(shuffle=True)`) randomly place tomorrow's readings into the training set and yesterday's readings into the test set. Because climate observations are highly autocorrelated, the model "memorizes" adjacent days and produces an artificially perfect score that fails completely in real-world deployment.

Similarly, spatial `GroupKFold` (splitting by buoy) leaks data because El Niño is a basin-wide event: in November 1997, the entire Pacific Ocean experiences warming simultaneously.

### The Solution: Chronological Partitioning by Climate Epochs
We partition `tao-all2` strictly by calendar years:

| Partition | Time Span | Observations | Climate Epoch & Strategic Purpose |
| :--- | :--- | :--- | :--- |
| **Training Set** | 1980 – 1993 | 67,892 (42.2%) | Contains 4 full ENSO cycles: 1982–83 Super El Niño, 1986–87 Moderate El Niño, 1988–89 Strong La Niña, and 1991–92 Moderate El Niño. Enables trees to learn universal physical dynamics. |
| **Validation Set** | 1994 – 1996 | 62,620 (38.9%) | Contains the 1994–95 El Niño and 1995–96 La Niña. Used to tune hyperparameters (tree depth, learning rate, lag windows) without touching the test set. |
| **Test Set** | 1997 – 1998 | 30,561 (19.0%) | Held-out evaluation benchmark. Evaluated on the historic 1997–1998 "Super El Niño of the Century" without the model ever seeing future data. |

*For `elnino` (a 14-day sample dataset without year columns), data was partitioned chronologically by day: Train (Days 1–9, 475 rows), Validation (Days 10–11, 101 rows), and Test (Days 12–14, 133 rows).*

---

## 6. Stage 5: Feature Normalization (Z-Score Standardization)

### The Problem
Atmospheric and oceanographic sensors operate on completely different scales:
* `humidity`: Mean ~74%, variance ~527, values up to 100%.
* `zonal_wind`: Mean ~ -3.3 m/s, variance ~9, values between -12 and +14 m/s.
* `air_temp`: Varies by only ~1.7°C standard deviation.

If features are unnormalized, models sensitive to scale (such as Neural Networks/LSTMs or linear baselines) treat humidity as 20–40 times more important simply because the numbers are larger.

### Methodology & The "Frozen Parameter" Rule
We use **Standard Z-score Standardization**:
```
scaled_value = (original_value - feature_mean) / feature_std
```

Applied to: `zonal_wind`, `meridional_wind`, `humidity`, `air_temp`, and `ss_temp`.

### Preventing Data Leakage
* **The Scaler is fit ONLY on the Training set (1980–1993).**
* The training mean and standard deviation are **frozen**.
* The Validation and Test sets are transformed using the **frozen training statistics**.
* *Why this matters:* We never recalculate mean/std on validation or test data. In real-world deployment, when future observations arrive, you do not know the future year's mean. You must normalize incoming data using the historical baseline your model was trained on.

---

## 7. How to Work with These Datasets in the Future (Guidelines for Next Steps)

As the project moves into **Feature Engineering** and **Model Training**, team members should adhere to the following rules:

### 1. Feature Engineering Boundaries
* **Always group by `buoy_segment_id` (or `site_id`) when creating lag features.** 
  * *Correct:* `df.groupby('buoy_segment_id')['zonal_wind'].shift(30)`
  * *Incorrect:* `df['zonal_wind'].shift(30)` (shifts data across different buoys).
* **Use trailing windows only.** Never use centered rolling windows (`rolling(..., center=True)` is prohibited as it looks forward into the future).

### 2. Modeling & Evaluation Standards
* **Headline Metric is Macro F1-Score:** Because extreme anomalies represent only ~5% of observations, plain accuracy is meaningless (a naive model predicting "Neutral" all the time achieves ~53% accuracy while catching 0% of climate disasters).
* **Always compare against a naive persistence baseline:** The model must prove it outperforms predicting "tomorrow's weather will be the same as today's weather."
* **Use `TimeSeriesSplit` if cross-validating:** Never use standard `KFold` or `train_test_split(shuffle=True)`. When cross-validating during hyperparameter tuning on the training set, use expanding time windows.

### 3. File Inventory in `data/processed/`
* Primary training data: `tao-all2-train.csv` (67,892 rows, 24 columns)
* Primary validation data: `tao-all2-val.csv` (62,620 rows, 24 columns)
* Primary test benchmark: `tao-all2-test.csv` (30,561 rows, 24 columns)
* Sample dataset splits: `elnino-train.csv`, `elnino-val.csv`, `elnino-test.csv`
* Complete reproduction pipeline: `notebooks/01_data_cleaning_and_preprocessing.ipynb`