# EDA: Spatial Coverage and Data Quality

**Notebook:** `notebooks/eda_space_and_data_quality.ipynb`
**Inputs:** `data/processed/features-train.csv` and `data/processed/features-val.csv` (monthly; stacked in the notebook with a `split` column). The test file is not used.
**Question:** Where are the buoys, how complete is their data, and do the climate-risk classes behave differently by longitude and over time?

## Summary

- **Coverage is uneven in space and time.** There are 62 buoys on 14 meridians (137°E to 95°W, latitude −8° to 9°). The earliest records are equatorial buoys in the east (110°W and 95°W, 1980 to 81), and most central and western buoys first appear between about 1989 and 1994. Only one buoy is validation-only.
- **Humidity is missing before the sensors arrived, and the first ten months after the pipeline's cutoff are not real either.** 410 monthly rows (11.7%) have no humidity, all before 1989. Per the pipeline documentation, humidity sensors arrived in November 1989, but the pipeline cuts at 1989, so January to October 1989 values are mean-filled placeholders. They look present in the heatmap but are not measurements.
- **Lag and rolling-feature blanks follow gaps in each buoy's monthly series.** For example, `ssta_lag6` is blank in 672 rows (19%), mostly at the start of a buoy's record or after missing months.
- **Class balance changes across all three periods.** In the monthly data, Neutral is about 65% of training rows and about 50% of validation rows. The team's daily-data analysis shows the test period (1997 to 98) is 20.71% Extreme Warm, versus 3.95% in training.
- **The class mix at each longitude flips between train and val.** This mainly reflects which ENSO phase each period contained. The western Pacific results may also be partly an artifact of how anomalies are computed (a hypothesis, with checks listed below).
- **Recommendation:** Treat humidity before November 1989 as missing, do not mean-impute lag or rolling features, validate in time blocks with per-class metrics, and verify the western-Pacific anomaly baseline before trusting longitude differences. See the recommendations table.

## Setup and scope

| Dataset | Label / target | Purpose |
|---|---|---|
| Monthly `features-train.csv` (1,988 rows, 1980-08 to 1993-09) | `target_risk` (class three months ahead), `target_ssta` | Examine coverage, missingness, and class behavior by longitude |
| Monthly `features-val.csv` (1,529 rows, 1994-01 to 1996-09) | same | Compare against train; look for shift |

The split is chronological, and October to December 1993 is skipped between train and val, which matches the three-month prediction horizon. The test set was deliberately not examined. According to the team's target-and-temporal doc, the daily test period covers 1997 to 98.

**Monthly vs. daily numbers.** The other EDA docs use daily buoy readings, while this notebook uses monthly rows (one buoy in one month). Percentages therefore differ. For example, Neutral is about 65% of monthly training rows but 57.75% of daily training labels.

### Conventions
- **Longitude is converted to 0 to 360 (`lon360`).** The raw data uses −180 to 180, which breaks at the dateline. Here 165°E = 165, 180° = 180, 170°W = 190, and 95°W = 265. A bigger value means further east in the Pacific.
- **East and west refer to the Pacific basin.** 137°E to 180° is the western Pacific (near Asia and Australia). 170°W to 95°W is the eastern Pacific (toward South America), which is why the *eastern* buoys carry "W" labels. Every graph runs west to east.
- **Heatmap colors (missingness):** white = value present, orange = row exists but the value is blank, black = no row for that month.
- **SSTA** (`ssta`) is the sea-surface temperature minus a site/month baseline computed from the training period only. It is how many °C warmer (+) or cooler (−) than usual.
- **Classes:** Extreme Cool, Moderate Cool, Neutral, Moderate Warm, Extreme Warm. These are labels based on local buoy SSTA thresholds (roughly ±0.5 °C and ±1.5 °C, inferred from sample rows), not official ENSO phases. `target_risk` is the class three months ahead.

### Notebook structure

| Section | What it does | Output |
|---|---|---|
| 1. Load | Reads train and val, stacks them with a `split` column; defines `core` (the five raw measurements) | `df` |
| 2. First look | Previews columns, counts blanks in the raw measurements, counts classes | Tables |
| 3. Structural checks | Split sizes and date ranges, blanks in every column, duplicate (buoy, month) rows, locations per buoy, summary statistics, folder listing | Printed checks |
| 4. Spatial coverage | Adds `date` and `lon360`, builds one summary row per buoy (`buoys`), orders buoys west to east (`order`), draws the map | Figure 1 |
| 5. Missingness | Builds buoy × month grids for `humidity` and `ssta_lag6`; blank rates by longitude | Figures 2 and 3, Table A |
| 6. Classes by longitude | Cross-tabs of `target_risk` by longitude for each split, chi-square and Cramér's V, stacked bars with n, SSTA stats | Figures 4 and 5, Table B |
| 7. Longitude × year | Mean `ssta` by longitude and year | Figure 6 |

| Setting | Where | Effect |
|---|---|---|
| `MIN_N = 30` | class-by-longitude cell | Bars with fewer rows are hatched |
| `piv.where(cnt >= 5)` | longitude × year heatmap | Cells with fewer rows are left blank |
| `for col in ['humidity', 'ssta_lag6']` | missingness cell | Add a column name for another heatmap |
| `target_risk` | class-by-longitude cell | Swap for `current_risk` to see the present state |

## Part 1: Spatial coverage

### Figure 1: Buoy map
**What it is:** A bird's-eye view of where every buoy sits.

**How to read it:**
- Left to right is west to east across the Pacific (137°E on the left, 95°W on the right). Bottom to top is south to north (0 is the equator).
- **Each circle is one buoy** (62 in total). **Size** = number of monthly observations. **Color** = the year the buoy first appears in the data (dark purple is 1980, yellow is about 1994).
- Circles are buoys that appear in train. The single triangle is the only buoy that appears *only* in val (5°N, 180°).

**What we found:**
- The buoys sit on 14 north–south lines and are densest near the equator.
- **The darkest (earliest) circles are equatorial buoys in the east:** 110°W (1980) and 95°W (about 1981). Equatorial buoys at 140°W and 125°W follow (about 1984), then 165°E and 170°W (about 1985 to 1988).
- **Most central and western buoys are green or yellow**, so they first appear between about 1989 and 1994. Western buoys (137 to 160°E) have small circles, meaning little data.
- The biggest circles are equatorial buoys in the east and the 165°E line.
- Train and val measure at almost the same places, since only one buoy is val-only.

**Why it matters:** A region that only starts in 1992 cannot teach the model anything about the 1980s.

**Watch out:** "First observation" means "first row in this dataset," not necessarily the date a buoy was deployed.

**Implications:** Interpret regional results with the start dates in mind, and report metrics by region instead of one overall number.

## Part 2: Missingness

### Figure 2: Humidity missingness heatmap

**What it is:** An "attendance sheet" for humidity: one row per buoy, one column per month.

**How to read it:**
- Each row is a buoy (labeled `latitude_longitude`), ordered west (top) to east (bottom). Each column is a month, August 1980 to September 1996, with a tick on every other January.
- White = row present and humidity present. Orange = row present but humidity blank. Black = no row that month.
- **The red line** marks the start of val (January 1994). The black stripe just before it is the skipped October to December 1993.

**What we found:**
- **Orange appears almost entirely before about 1989 and then stops abruptly.** All 410 blank humidity values come from this early period.
- **The sharp edge at 1989 is the pipeline's cutoff, not the sensor start date.** Per the pipeline documentation, humidity sensors arrived in November 1989, but the pipeline uses `year >= 1989`. January to October 1989 values are mean-filled placeholders (one value per month), so the white area just after the edge includes about ten months of values that were not measured.
- **Most of the early years are black.** Before 1989 only a handful of eastern buoys and the 165°E line have rows.
- **After about 1990 the black patches are gaps in otherwise active buoys.** The four buoys along 180° have black stripes in the same months in 1994 to 1996, which suggests a shared cause such as an outage or servicing gap. This is a hypothesis.

**Why it matters:** If the early humidity blanks (and the placeholder months) were filled with an average, every month before November 1989 would look like "average humidity," even though nothing was measured. That period includes major warm and cool events.

### Figure 3: `ssta_lag6` missingness heatmap

**What it is:** The same attendance sheet for `ssta_lag6`, the temperature anomaly from six months earlier. Orange here means "this buoy has a row this month, but it had no row six months ago."

**What we found:**
- **Orange appears at the start of each buoy's record and again right after every gap.** Each black gap casts a roughly six-month shadow of orange.
- So these blanks are a side effect of missing months, not a separate sensor problem.
- We do not see a full-width orange band after the red line. If lags had been computed after October to December 1993 was removed, early-1994 lags would be blank for every buoy. Their absence suggests lags were calculated *before* that gap was removed. This is unconfirmed.

**Why it matters:** Humidity blanks mean "this sensor wasn't measuring." Lag blanks mean "there is no earlier month to look at." They are different problems. Filling a lag with the average pretends we know the past.

### What the heatmaps cannot show
Wind and air temperature have no blanks in these files. That is not because they are complete: the upstream pipeline filled their gaps with one Pacific-wide average per calendar month (about 12.8% of daily training rows for wind, up to 40% in 1985, and roughly 5,500 daily rows for air temperature). Every filled row in a month gets the same value at every buoy. 

### Table A: Blank rates by longitude
Humidity blanks occur only at longitudes with pre-1989 data (165°E and the central and eastern Pacific: 2% to 25%), and are 0% in the west. `ssta_lag6` blanks are highest where a buoy line has few rows: 143°E (6 rows) is 100% blank, and 160°E (11 rows) is 55% blank. The rates do not count the placeholder months in 1989.

**Implications:** Mask humidity before November 1989 before analysis or modeling. Do not mean-impute lag or rolling features. Ask for the fill flags from the daily pipeline.

## Part 3: Class mix by longitude

### Figures 4 and 5: Class mix by longitude (train and val)

**What they are:** Stacked bar charts (Figure 4 for train, Figure 5 for val) answering: *"Of all rows at this longitude, what fraction ended up in each class three months ahead?"*

**How to read them:**
- Each bar is one longitude, west on the left and east on the right, and **always adds up to 100%**. Segments: dark blue = Extreme Cool, light blue = Moderate Cool, gray = Neutral, light red = Moderate Warm, dark red = Extreme Warm.
- **"n=…" above each bar** is the number of rows behind it. A small n means shaky percentages. **Hatched bars** have fewer than 30 rows.
- Val has 11 longitudes instead of 14, because 143°E, 160°E, and 170°E have no val rows.

**What we found in Figure 4 (train):**
- **Western longitudes are 100% Neutral.** Several of those bars are tiny (hatched), but 147°E (n=46) and 156°E (n=89) are also entirely Neutral, so this is not only a small-sample effect. Part of it may be physical (the western ocean varies less), and part may be an artifact of how anomalies are computed (see Table B).
- **Extreme classes appear mainly from about 170°W eastward**, where bars are mixed: cool classes at the bottom, warm classes on top.
- The 95°W bar (n=48) has the largest warm share (9 of 48 rows Extreme Warm), but it rests on a small sample from essentially one buoy.

**What we found in Figure 5 (val):**
- **The picture flips.** From 180° eastward, a third to three-quarters of rows are cool classes (95°W: about 74% Moderate or Extreme Cool). The far west (137 to 156°E) is about 50% Moderate Warm.
- That west-warm, east-cool arrangement is the classic ENSO see-saw and is consistent with a La Niña-like period (1995 to 1996).
- **The same location has a very different mix in different periods.** 95°W is about 19% Extreme Warm in train and 0% in val.

**The statistics:** Longitude and class are related in both splits. Cramér's V is **0.20 in train and 0.31 in val**, a modest-to-moderate link. The chi-square p-values are extremely small but overstated, because rows from the same buoy, and from different buoys in the same month, are very similar to each other. Use V and the pictures.

**Why it matters:** Location relates to class, but the relationship is not stable over time. A model that learns "the east is mostly warm" from train could be badly wrong in a cool period.

### Table B: SSTA by split and longitude

**What we found:**
- **Spread grows from west to east in both splits.** In train, the SD is about 0.25 in the far west, about 0.5 in the central Pacific, and about 1.0 in the east. Val shows the same gradient.
- **The averages change between splits.** In train they are near zero everywhere. In val they are +0.2 to +0.6 in the west and −0.1 to −1.1 in the east.
- **180°E in train has n=28 and SD 0.00.** Every one of those rows has essentially the same `ssta`.

**Implications:** Do not treat western-Pacific class shares in train as a real climate signal until the baseline question is settled. Report metrics per longitude and flag longitudes with short training records.

## Part 4: Mean SSTA by longitude and year

### Figure 6: Mean SSTA by longitude and year

**What it is:** A calendar of ocean temperature: for every location and year, how much warmer or cooler than normal the ocean was on average.

**How to read it:**
- Each row is a longitude (west on top, east on the bottom). Each column is a year, 1980 to 1996.
- **Color = average anomaly.** Red = warmer than normal, blue = cooler, white = about normal (the scale runs about −1.7 to +1.7 °C).
- **Blank cells mean fewer than 5 rows**, i.e. "not enough data," not "normal." The black vertical line between 1993 and 1994 marks the start of val.

**What we found:**
- **Warm and cool events show up as vertical stripes** in the east: warm in 1987 (about +1.5 at 140°W), strongly cool in 1988 (down to about −1.7 at 125°W), and warm in 1991. These are consistent with the well-known 1986–87 El Niño, 1988–89 La Niña, and 1991–92 El Niño.
- **1995 and 1996 show the see-saw.** The far west (137 to 156°E) is warm (about +0.5 to +0.9) while 180° and the east are cool (about −1.5 by 1996 at 180° and 95°W).
- **The entire 1983 column is blank.** The source daily data has no observations at all from May to September 1983 (and few in April and October), so the peak of the 1982–83 El Niño is not observed as current SSTA anywhere.
- **The left side is mostly empty.** Before about 1990, only the eastern buoys and 165°E have enough data to color a cell.

**Why it matters:** Figures 4 and 5 show class mix varies by longitude but cannot say whether that is location or timing. This figure shows the timing directly: much of the apparent longitude difference comes from which events fell in each period (with the baseline caveat above for the west).

**Implications:** Evaluate by ENSO event or phase, not only by overall score, and avoid extrapolating from the early east-only years.

## Final recommendations

| Recommendation | Evidence | Next action |
|---|---|---|
| Treat humidity before November 1989 as missing | Pipeline cutoff `year >= 1989`; sensors arrived Nov 1989; heatmap edge | Set `humidity` to NaN for `ym < '1989-11'`, then choose: drop it (the team's feature analysis scored humidity at noise level), add a "was missing" flag, or train only on November 1989 onward. A flag can act as a stand-in for "early years," so test with and without it |
| Do not mean-impute lag or rolling features | Blanks are shadows of missing months | Use models that accept NaN (HistGradientBoosting, XGBoost, LightGBM), fill short gaps only, or accept dropping rows (`ssta_lag6` is blank in about 19%) |
| Do not assume wind and air temperature are complete | Upstream mean-fill (about 12.8% of daily training rows for wind) | Obtain fill flags from the pipeline and compare models with and without filled rows |
| Verify the western-Pacific anomaly baseline | SD 0.00 at 180°E; baseline from training only | Run the two checks in Part 3; report per-longitude metrics only where training records are long enough |
| Use blocked validation and per-class metrics | Train is mixed, val is cool-dominated, and test (1997 to 98) is 20.71% Extreme Warm in the daily data | Forward-chaining time blocks with a gap of at least 6 months (the longest lag); report macro-F1 and per-class recall, and per event; compare against "always Neutral" and persistence (`current_risk`) baselines |
| Test with and without `lat` / `lon` | Class mix by longitude is unstable across periods | Compare models; location may mostly proxy for how variable the ocean is there |
| Be cautious extrapolating from early years | Coverage starts east-only; 1983 is empty | Report results by region and period |
| Keep models simple and temper expectations | Only a handful of ENSO events; rows in the same month share information | Prefer simple baselines first; treat very high scores skeptically |

## Limitations

- **Interpretations of ENSO events come from the graphs and general knowledge**, not from the label definitions. "La Niña-like in 1995 to 1996" is consistent with the data, not formally verified.
- **The chi-square p-values are overstated** because rows are strongly correlated. Rely on effect sizes and plots.
- **"First observation" is not a deployment date.** It is when a buoy first appears in this dataset.
- **The shared-outage explanation for aligned gaps at 180°** is a hypothesis.
- **Some bars and cells rest on very few rows.** Check the n labels and blank cells.

**Bottom line:** The data is structurally clean, but coverage, humidity, lag blanks, and class balance are all shaped by time. Mask humidity before November 1989, avoid mean-filling lags, validate in time blocks with per-class metrics, and settle the western-Pacific baseline question before reading anything into longitude differences.