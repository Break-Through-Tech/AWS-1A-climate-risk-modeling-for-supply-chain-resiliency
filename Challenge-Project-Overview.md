# Climate Risk Modeling for Supply Chain Resiliency

**Company / Org:** Amazon Web Services  
**Challenge Advisor:** Megan McKenzie, megankaymckenzie@gmail.com  
**AI Studio Coach:** Julio Contreras, Julio.Contreras@breakthroughtech.org   
**Program:** Break Through Tech AI Studio - Fall 2026

---

## 🏢 About Amazon Web Services

Amazon Web Services (AWS) provides cloud computing services to businesses and organizations globally, enabling them to innovate and scale applications quickly and efficiently. 

---

## 🎯 The Challenge

### Project Summary
In this project, you will use spatial-temporal oceanographic and atmospheric tabular data, as well as advanced machine learning techniques (such as Gradient Boosted Trees and time-series feature engineering) to build a predictive risk model that forecasts Sea Surface Temperature Anomalies (SSTAs) and classifies climate risk thresholds months in advance. This will help our organization address the severe supply chain disruptions, logistics delays, and infrastructure vulnerabilities caused by global climate events like the El Niño-Southern Oscillation (ENSO).

### Success Criteria

- Pipeline Completeness: A modular pipeline that ingests raw data from the UCI El Niño repository, cleans sensor logs using programmatic imputation, and splits data into train, validation, and test partitions.

- Predictive Performance: A classification model that significantly outperforms a naive baseline. It will be evaluated using the Macro F1-Score to ensure it accurately predicts rare, high-impact climate anomalies (extreme warming/cooling spikes) rather than just the majority "normal" states.

- Model Interpretability: Inclusion of feature importance or SHAP value plots to visually explain to business stakeholders exactly which variables (like wind vectors or subsurface temperatures) are driving the risk flags.

- Professional Handoff: A clean, open-source GitHub repository featuring a clear data dictionary in the README.md, well-commented code, and a final presentation translating technical findings into business insights.

### Stretch Goals
Explore basic recurrent architectures like temporal LSTMs (PyTorch) or wrapping the model into a minimal interactive dashboard interface (Streamlit or Gradio) to demonstrate real-time risk scoring for organizational stakeholders.

### Project Milestones

Use these milestones to guide your work. Your team will create a **GitHub Projects board** to track tasks within each milestone.

| Month | Milestone | Key Activities |
|-------|-----------|----------------|
| **September** | Foundation & Scoping | Deconstruct the business problem, initialize the coding environment, and build the structural blueprint. Deliverable: A technical scoping document mapping out individual team roles, task distributions, and initial data loading confirmations. |
| **October** | Feature Engineering & Baseline Models | Clean the raw dataset and engineer robust predictive features. Begin to train, tune, and evaluate machine learning architectures to predict and classify risk. Deliverable: A reproducible, modular preprocessing script that outputs cleaned, scaled, and split train/validation sets. |
| **November** | Model Refinement & Handoff | Continue to train, tune, and evaluate machine learning architectures to predict and classify risk and finalize the codebase to professional open-source standards and present the solution. Deliverable: Serialized model weights/artifacts accompanied by a validation leaderboard detailing model performance. Also a clean, production-grade GitHub repository and a live final presentation delivered to the corporate leadership team. |

> **Note for the team:** Please create a GitHub Projects board in this repository to break these milestones into weekly tasks. Go to the **Projects** tab → **New project** → Choose **Board** → Add columns for each month.

---

## 📊 Dataset

**Name and Source:** UCI El Niño repository  
**Format:** CSV  
**Size:** under 1gb  
**Location:** [https://archive.ics.uci.edu/dataset/122/el+nino](https://archive.ics.uci.edu/dataset/122/el+nino)

### Key Details

- **Size and coverage.** 178,080 observations from the TAO/TRITON moored buoy array in the tropical Pacific, spanning **7 March 1980 to 23 June 1998**. The record ends in 1998.
- **Columns.** Observation ID, date fields, latitude, longitude, zonal winds, meridional winds, humidity, air temperature, and sea surface temperature.
- **The target needs to be derived.** The file contains **raw sea surface temperature in degrees C**, not anomalies. El Niño and La Niña are defined by departures from a long-term average for a given location and calendar month, so building a climatological baseline is part of the work.
- **Missing values are substantial and are not random.** Humidity is absent from about 37% of rows, both wind components from about 14%, air temperature from 10%, and sea surface temperature from about 10%. Humidity is missing from **100% of records before 1989** because those sensors were added to the array later, dropping to roughly 15% by the mid-1990s. Imputing with a global mean will fill 1980s rows with 1990s sensor values, so plot missingness over time before deciding how to handle it.
- **Buoy positions drift.** Moorings are nominally fixed but move within a watch circle, so the file contains **8,536 distinct coordinate pairs across roughly 219 mooring locations**. Grouping on raw latitude and longitude will produce thousands of spurious groups. Bin to nominal sites first.
- **Year is stored as a two-digit offset** (`80` through `98`). Convert to a four-digit year before any date arithmetic.

> ⚠️ **Do not use a random train/test split on this data.**
>
> These observations are a time series, and consecutive readings are highly correlated. A random split puts future observations in your training set and past observations in your test set, which lets the model see information it would never have at prediction time. The result is an excellent score and a worthless model.
>
> **Split by time instead.** Train on earlier years, validate and test on later ones, or use `TimeSeriesSplit` for cross-validation. `train_test_split(..., shuffle=True)` is the default in most tutorials and it is wrong here.

---

## 🛠️ Suggested Approach

**ML Problem Type:** Classification, Regression, Time Series Analysis

**Recommended Libraries:**
- pandas, numpy, scikit-learn, xgboost or lightgbm, shap, matplotlib, seaborn, PyTorch

**Evaluation Metrics:**
- **Macro F1** is the headline metric. It weights each risk class equally, so the model has to actually detect rare warming and cooling events rather than scoring well by predicting "normal" most of the time.
- **Per-class precision and recall**, reported separately for every risk class. A single averaged number hides a model that is excellent on the majority class and useless on the extremes.
- **Confusion matrix**, so you can see which classes get mistaken for which.
- **A naive baseline for comparison.** Always report a majority-class or persistence baseline alongside your model. If your classifier does not clearly beat it, the score is not meaningful.

Note that plain accuracy is not a useful headline here. Extreme anomalies are rare by definition, so a model that never predicts them can still post high accuracy while missing every event the project exists to catch.

---

## 📚 Resources to Get Started

The following resources will help your team understand the problem space and potential technical approaches for this project:

**Background Reading:**
- [UCI El Niño dataset page](https://archive.ics.uci.edu/dataset/122/el+nino) — the source of your data, with the variable list and collection notes.
- [Climate Variability: Oceanic Niño Index](https://www.climate.gov/news-features/understanding-climate/climate-variability-oceanic-nino-index) (NOAA Climate.gov) — how El Niño and La Niña are actually defined, and why the definition uses *anomalies* rather than raw temperature. Read this first.
- [Global Tropical Moored Buoy Array: TAO/TRITON](https://www.pmel.noaa.gov/gtmba/taotriton-collaboration) (NOAA PMEL) — the buoy network that produced these measurements.
- [What the buoys measure](https://www.pmel.noaa.gov/gtmba/sampling) (NOAA PMEL) — instrument details, useful for understanding why some readings are missing.

**Technical Tutorials:**
- [Cross-validation for time series](https://scikit-learn.org/stable/modules/cross_validation.html) (scikit-learn) — see the `TimeSeriesSplit` section. Essential before you split this dataset.
- [`TimeSeriesSplit` reference](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html) (scikit-learn).
- [SHAP documentation](https://shap.readthedocs.io/en/latest/) — for the model interpretability deliverable. Start with the tabular and tree-model examples.
- [`classification_report`](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.classification_report.html) (scikit-learn) — gives per-class precision, recall, and F1 in one call.

**Code Examples:**
- [LightGBM documentation](https://lightgbm.readthedocs.io/en/stable/) — gradient boosted trees, a strong default for tabular problems like this one.
- [Oceanic Niño Index table](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/ensostuff/ONI_v5.php) (NOAA CPC) — official ONI values by season. Useful if you want an external reference for labeling risk periods.

**Other:**
- Ask your AI Studio Coach for a walkthrough of any of these. The ENSO background reading and the time-series cross-validation tutorial are the two worth doing before you write modeling code.

*Feel free to explore beyond these, and share anything interesting you find with me!*

---

## 🤝 How We'll Work Together

**Official check-ins:** During our biweekly 45-minute AI Studio Lab Section meeting block (2nd and 4th week of every month)

**Recommended free coding / collaboration tools**
* [Google Colab](https://colab.research.google.com/)
* GitHub (you are here)
---

## 🚀 Getting Started

1. **Review this overview document** and note any questions for our first meeting
2. **Begin reviewing the dataset** using the link above
3. **Read the GitHub Projects documentation** [here](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)

I’m excited to work with you!

---

## ❓ Questions?

Please bring any questions to our first meeting during the week of August 24th (Break Through Tech’s Bridge to Studio - Session C). 
