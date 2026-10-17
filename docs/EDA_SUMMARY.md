# EDA Summary: All Findings in One Place

This markdown combines the results of our three EDA notebooks into one short list. For the full detail, plots, and numbers, see the source docs linked in each section.

| EDA doc | Notebook | Main question |
|---|---|---|
| [`EDA_VISUALS.md`](EDA_VISUALS.md) | `notebooks/eda_visuals.ipynb` | Which features help forecast the risk class 3 months ahead? |
| [`EDA_TEMPORAL_ANALYSIS.md`](EDA_TEMPORAL_ANALYSIS.md) | `notebooks/eda_temporal_analysis.ipynb` | How do the labels and ocean temperatures change over time? |
| [`EDA_SPACE_AND_DATA_QUALITY.md`](EDA_SPACE_AND_DATA_QUALITY.md) | `notebooks/eda_space_and_data_quality.ipynb` | Where are the buoys, how complete is the data, and does class mix change by location? |

All three use the **training split only** (1980–1993) to make feature decisions. The space/data-quality notebook also looks at validation (1994–1996). None of them use the test set (1997–1998) for decisions!

## Quick glossary

| Term | What it means | Example |
|---|---|---|
| **Target** | What the model is trying to predict: the risk class **3 months from now** (`target_risk`), or the temperature anomaly then (`target_ssta`) | In January, predict April's class |
| **Anomaly** (`_anom`, `ssta`) | How far a reading is from "normal" for that buoy and calendar month. Positive = warmer/stronger than usual, negative = cooler/weaker | `ssta = +1.2` means the water is 1.2 °C warmer than usual for that spot in that month |
| **Lag** (columns ending in `_lag1`, `_lag3`, …) | The value from X months ago, copied onto this month's row. Each lag is its own column, made from the variable at the start of its name | `ssta_lag3` on April's row = January's `ssta` |
| **Rolling** (columns ending in `_roll3`, `_roll6`) | The average over the last X months. It smooths out one-off noisy months | `ssta_roll3` in April = average of Feb, Mar, Apr |
| **Change** (`_change1`, `_change3`) | This month minus X months ago, i.e. is it heating up or cooling down? | `ssta_change3` = April − January |
| **Basin-wide** | One value per month averaged across the whole Pacific (or a region like Niño 3.4), shared by every buoy | `basin_ssta` = average `ssta` across all buoys that month |
| **Zonal / meridional wind** | Zonal = east–west wind, meridional = north–south wind | Negative zonal = the normal westward trade winds |
| **Correlation (r)** | How closely two things move together in a straight line, from −1 to 1. Close to 0 = no straight-line link | r = 0.85 means they rise and fall almost together |
| **MI (mutual information)** | How much a feature tells us about the target, including curved or threshold patterns that correlation misses. 0 = no help | Random numbers score 0.001; our best features score ~0.28 |
| **Macro F1** | A score that weighs every class equally, so the model can't look good by just guessing "Neutral" | "Always Neutral" scores only 0.13 |
| **Persistence baseline** | The simplest guess: "the class in 3 months = the class now." Our model has to beat it | Scores 0.35 Macro F1 on validation |

---

## 1. In `EDA_VISUALS.md` we found…

1. **Temperature anomalies carry most of the signal.** SST anomalies (`ssta`, `nino34_ssta`, `basin_ssta`) and the air-temperature anomaly (`air_temp_anom`) separate the classes 3 months ahead most clearly.
2. **The wind signal is basin-wide, not local.** A buoy's own wind barely helps us find the target, but basin-wide `basin_zwind_anom` ranks 4th best feature/indicator.
3. **Western Pacific wind is an early warning.** The equatorial wind anomaly at 140°E–180° leads the Niño 3.4 SST anomaly by about 2 months (r = 0.75), and is still r = 0.70 at our 3-month horizon.
4. **New feature worth adding:** `west_pac_zwind_anom` (MI 0.282). It is the best wind feature we tested.
5. **Some features basically repeat each other.** `air_temp` and `ss_temp` move almost together (r = 0.85), since the air over the ocean just follows the water. On top of that, `air_temp` is literally `ss_temp + air_sea_diff`, so using all three hands the model the same info twice. Simple rule: pick one version of each variable, and go with the anomaly version (like `air_temp_anom`), because that's the one that helps us find the target.
6. **Skewed data is okay, no need to fix it.** The long tails are the El Niño / La Niña events, which is exactly what we're trying to predict, so we keep the outliers. Tree models split on thresholds, so skew will not bother them.
7. **Humidity and the month features don't help us find the target.** `humidity`, `month_sin` and `month_cos` scored about the same as a column of random numbers (MI < 0.01).
8. **A buoy's own wind history barely helps.** The lags and rolling averages of local wind score just above noise (MI 0.01–0.04). This month's wind is worth keeping for now, but the history adds a lot of columns without adding much signal.
9. **Location helps, just not in a straight line.** `lon` doesn't line up with the target on its own (correlation −0.02), but it still helps us find the target (MI 0.10), because the east and west Pacific behave differently. Keep `lat` and `lon`.
10. **A few features we tried in EDA shouldn't go in the model.** `wind_dir_to` is a compass angle, so 359° and 1° look far apart even though they're basically the same wind. `air_sea_diff_anom` and `wind_speed_anom` say something about today's class but don't help predict 3 months out.
11. **Bottom line: we could go from 35 features down to 23.** Add 1 new wind feature, keep the 22 that help, and take out the 13 that don't do much. We'll only make the cut if the model agrees (see Next Steps).

**Features that help us find the target (keep these):**
- SST anomalies: `ssta`, `ssta_lag1`, `ssta_lag2`, `ssta_lag3`, `ssta_lag6`, `ssta_roll3`, `ssta_roll6`, `ssta_change1`, `ssta_change3`
- Basin-wide: `basin_ssta`, `nino34_ssta`, `nino34_ssta_roll3`, `basin_zwind_anom`, plus the new `west_pac_zwind_anom`
- Air temperature: `air_temp_anom`, `air_temp_anom_lag1`, `air_temp_anom_lag2`, `air_temp_anom_lag3`, `air_temp_anom_lag6`
- Location: `lat`, `lon`
- This month's wind: `zonal_wind_anom`, `mer_wind_anom` (weak, but above noise)

**Features we could consider taking out (13):**

| Feature | Why it's not really needed |
|---|---|
| `humidity` | Scores like random noise, and the data before Nov 1989 isn't real anyway |
| `month_sin`, `month_cos` | Score like random noise (the temporal doc wants to test them first, see section 4) |
| `zonal_wind_anom_lag1`, `zonal_wind_anom_lag2`, `zonal_wind_anom_lag3`, `zonal_wind_anom_lag6` | Past local wind adds almost nothing |
| `zonal_wind_anom_roll3`, `zonal_wind_anom_roll6` | Same, just averaged |
| `mer_wind_anom_lag1`, `mer_wind_anom_lag2`, `mer_wind_anom_lag3`, `mer_wind_anom_lag6` | Same story for north–south wind |

**Don't add at all:** `wind_dir_to`, `air_sea_diff_anom`, `wind_speed_anom`.

## 2. In `EDA_TEMPORAL_ANALYSIS.md` we found…

1. **Most of the data is "Neutral."** About 58% of training days are Neutral, while the two extreme classes are only about 4–5% each. A model could guess "Neutral" all the time and still look okay, which is why we score with Macro F1.
2. **The test years look very different from training.** Extreme Warm jumps from about 4% of days in training to about 21% in test, because of the huge 1997–98 El Niño. So the model has to handle conditions it rarely saw during training.
3. **Some val/test rows have no label (about 14–16%).** These are buoy + calendar-month combos that never showed up in training, so there's no "normal" to compare against and no class can be calculated. We just skip them when scoring.
4. **The data matches real history.** The anomalies show the known El Niño warm-ups in 1982–83 and 1997–98 and the La Niña cool-down in 1988–89, so the anomaly math looks right.
5. **There's a hole in 1983.** There are no buoy readings at all from May to September 1983. That's missing data, not a bug, and we shouldn't fill it in.
6. **Raw ocean temperature has seasons, but anomalies mostly don't.** Raw SST peaks around April–May. Anomalies already subtract each month's "normal," so most of the season is taken out. That may be why `month_sin` / `month_cos` don't add much.
7. **Recent ocean temperature is the best clue for the future.** This month's anomaly is strongly tied to next month's (0.90) and still to the one 3 months out (0.72), but the link fades to about zero by 8 months. That's why `ssta` (0.65), `ssta_roll3` (0.59), `ssta_lag1` (0.55) and `air_temp_anom` (0.54) help us find the target the most, while `ssta_lag6` barely does (0.08).

## 3. In `EDA_SPACE_AND_DATA_QUALITY.md` we found…

1. **The buoys weren't all there from the start.** There are 62 buoys across 14 longitudes. The eastern Pacific ones start in 1980–81, but most central and western ones only show up around 1989–1994. So the early years mostly tell us about the east.
2. **Humidity before November 1989 isn't real.** Before 1989 it's just blank (410 monthly rows, about 12%), and January–October 1989 got filled with averages because the pipeline cuts at `year >= 1989` instead of November 1989. That's another reason humidity is on the take-out list.
3. **Wind and air temperature look complete, but some of it is filled in.** When a sensor was down, the pipeline filled the gap with one Pacific-wide average for that month, so every buoy got the same number. That's about 13% of training days for wind (up to 40% in 1985).
4. **Blank lag and rolling values just come from missing months.** If a buoy has no reading from 6 months ago, its `ssta_lag6` is blank (19% of rows). We shouldn't fill these with averages, because that pretends we know the past.
5. **Lags might be reaching across the Oct–Dec 1993 gap.** Early-1994 lags aren't blank when we'd expect them to be, so they may have been calculated before those months were dropped. This isn't confirmed yet.
6. **Location matters, but not the same way every period.** In training, the west is almost all Neutral and the extreme classes show up mostly in the east. In validation (1995–96, La Niña-like) it flips: the east is cool and the west is warm. So location helps a little (Cramér's V 0.20–0.31, a modest link), but the model can't count on "east = warm."
7. **The west might look calmer than it really is.** The ocean naturally swings less in the west (SD about 0.25, vs. about 1.0 in the east). But the 180° line has an SD of exactly 0.00 in training (28 rows), which looks like a calculation issue. We should check this before trusting any western Pacific results.

## 4. Where the docs agree, and where they disagree

**All three agree:**
- Recent ocean and air temperature anomalies help us find the target the most.
- A buoy's own wind doesn't help much on its own.
- Most of the data is Neutral and the class mix changes over time, so we score with Macro F1 and check each class.
- There's not much data before about 1986–1989, so take early-year results with a grain of salt.
- Humidity before November 1989 should count as missing.

**They disagree on (we need to decide together):**

| Topic | `EDA_VISUALS.md` says | `EDA_TEMPORAL_ANALYSIS.md` says |
|---|---|---|
| `month_sin`, `month_cos` | Drop candidates (MI at noise level) | Keep as candidates (raw SST is seasonal) |
| Local wind lags / rolling | Trim 10 of them | Don't drop on correlation alone; test with the model |
| `ssta_lag6` | Keep | Weak (0.08); test whether it adds value |

Both docs say "confirm on validation before deleting," so the fair way to settle this is the model comparison in Next Steps below.

---

## 5. Next steps 

Below are the POSSIBLE changes coming out of EDA. Some happen **before** we build a model, some **during**:

| Order | Step | When |
|---|---|---|
| 1 | Fix the data (A) | Before modeling |
| 2 | Add the new feature (B) | Before modeling |
| 3 | Build a simple first model and compare feature sets (D) | During modeling |
| 4 | Delete the columns the model says we don't need (C) | During modeling, after step 3 |
| 5 | Tune the model on the locked feature list | After |
| 6 | Run on the test set **once**, at the very end | Last |

### A. Fix data issues in the pipeline / `feature_engineering.ipynb`
**When: before modeling.** If the data going in is off, every model result is off too, including the comparison we use to decide what to cut.

- [ ] **Confirm when lags are computed** relative to the Oct–Dec 1993 gap, so early-1994 lags don't look back into removed months. *Do this first, since it could throw off validation scores.*
- [ ] **Change the humidity cutoff** from `year >= 1989` to November 1989 (`ym >= '1989-11'`) in both the pipeline and `feature_engineering.ipynb`, so Jan–Oct 1989 placeholders become `NaN`.
- [ ] **Fix or flag the wind / air-temp mean-fill.** Either fill per site (move the fill after `site_id` is created in Step 4) or add `wind_filled` / `air_temp_filled` flag columns so we can test with and without filled rows. *The full fix is bigger; at minimum, add the flags before modeling.*
- [ ] **Check the western Pacific baseline** (why 180° has SD 0.00 in train) before trusting longitude results. *This one doesn't block modeling, but finish it before we report anything by longitude.*

### B. Columns to add
**When: before modeling.** We need `west_pac_zwind_anom` in the data so we can test it in step D.

- [ ] **Add `west_pac_zwind_anom`**: equatorial (2°S–2°N) zonal wind anomaly averaged over 140°E–180°, one value per month. Put it next to the other basin-wide features.

### C. Columns to delete (candidates, confirm with model first)
**When: during modeling, after step D.** Don't delete anything yet. The docs disagree on some of these, so we let the model settle it first.

- [ ] **Drop noise-level features:** `humidity`, `month_sin`, `month_cos` (see disagreement above on the month features).
- [ ] **Trim weak local wind lags:** `zonal_wind_anom_lag1`, `zonal_wind_anom_lag2`, `zonal_wind_anom_lag3`, `zonal_wind_anom_lag6`, `zonal_wind_anom_roll3`, `zonal_wind_anom_roll6`, `mer_wind_anom_lag1`, `mer_wind_anom_lag2`, `mer_wind_anom_lag3`, `mer_wind_anom_lag6`. Keep only the current-month `zonal_wind_anom` and `mer_wind_anom`.
- [ ] **Do not add:** `air_sea_diff_anom`, `wind_speed_anom`, `wind_dir_to`.

### D. How to decide
**When: during modeling, with our first simple model.**

Compare Macro F1 on the **validation** set (never test) for three feature sets:

| Version | Features |
|---|---|
| Current | 35 |
| Current + new wind | 36 (35 + `west_pac_zwind_anom`) |
| Trimmed | 23 (recommended list from `EDA_VISUALS.md`) |

Every version must beat the **persistence baseline (Macro F1 = 0.353)**. Once we pick one, we MUST update `FEATURES` in `feature_engineering.ipynb` and `FORECAST_FEATURES.md` in one change.

---

## 6. Things to keep in mind for model making

**Evaluation**
- **Score with Macro F1 and per-class F1, not accuracy,** and always beat the persistence baseline (0.35).
- **Never tune on the test set.** Use validation for all choices; touch test once at the end.
- **Keep the chronological splits.** No random shuffling, because rows from the same month are very similar and would leak.
- **Expect the test set to look different.** It is 20.71% Extreme Warm (vs. 3.95% in train). A model can do well on val and still struggle on test.
- **Report results by region and by ENSO event,** not just one overall number.

**Class imbalance**
- Only 66 Extreme Warm and 90 Extreme Cool rows in the monthly training data. Use **class weights** (e.g. `class_weight='balanced'`) or similar.

**Missing values**
- **Do not mean-impute lag or rolling features.** Use models that handle `NaN` natively (LightGBM, XGBoost, HistGradientBoosting).
- **Validation/test have missing labels** (~14–16%). Drop those rows for scoring, and note the reduced coverage.

**Features**
- **Train on `features-*.csv` with `target_risk`, not the daily files.** The daily class is calculated from that day's temperature, so the model would just read the answer off the row.
- **Near-duplicate features split importance.** The top SST features are highly correlated (r 0.83–0.95), so explain the model by **feature family** (buoy SST, basin SST, wind, air temp, location) rather than single SHAP values.
- **Test with and without `lat` / `lon`.** The class mix by location is not stable over time, so the model may learn a pattern that only holds in one period.

**Model choice**
- **Start simple.** A tree model (LightGBM / Random Forest) is a good first try: it handles skew, nonlinear effects, and `NaN`.
- **Possible framing:** classification on `target_risk`, or regression on `target_ssta` then convert to a class. Both targets are already in the feature files.
- **If using cross-validation,** use forward-chaining time blocks with a gap of at least 6 months (the longest lag).
