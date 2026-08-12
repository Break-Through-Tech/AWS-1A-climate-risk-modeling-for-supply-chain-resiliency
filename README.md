# Climate Risk Modeling for Supply Chain Resiliency

A predictive risk model that classifies climate anomalies from Pacific buoy sensor data and gives organizations months of lead time before supply chain disruptions hit.

## Business Problem

Global climate events, particularly the El Nino-Southern Oscillation (ENSO), cause severe supply chain disruptions, logistics delays, and infrastructure vulnerabilities. This project builds a predictive risk model that forecasts SSTAs and classifies climate risk levels, giving organizational stakeholders early warning to mitigate downstream impacts.

## Dataset

**UCI Machine Learning Repository: El Nino Dataset (ID: 122)**
https://archive.ics.uci.edu/dataset/122/el+nino

The dataset contains spatial-temporal oceanographic and atmospheric measurements from buoy sensors, including sea surface temperatures, air temperatures, wind vectors, humidity, and subsurface readings across the tropical Pacific.

### Data Dictionary

| Feature | Description | Unit |
|---------|-------------|------|
| `latitude` | Buoy latitude position | Degrees |
| `longitude` | Buoy longitude position | Degrees |
| `year` | Observation year | YYYY |
| `month` | Observation month | 1-12 |
| `day` | Observation day | 1-31 |
| `date` | Full observation date | Date |
| `ss_temp` | Sea surface temperature | Celsius |
| `air_temp` | Air temperature | Celsius |
| `humidity` | Relative humidity | Percent |
| `zonal_wind` | East-west wind component (u-wind) | m/s |
| `meridional_wind` | North-south wind component (v-wind) | m/s |
| `subsurface_temp` | Subsurface ocean temperature | Celsius |

*Note: Some features may contain missing values due to sensor malfunctions. Programmatic imputation is part of the pipeline.*

## Project Goals

**Primary:** Build a classification model using Gradient Boosted Trees and time-series feature engineering that significantly outperforms a naive baseline at predicting climate risk thresholds (extreme warming/cooling spikes vs. normal states), evaluated on Macro F1-Score.

**Stretch:** Explore temporal LSTMs (PyTorch) for sequence modeling, or wrap the trained model into a minimal interactive dashboard (Streamlit or Gradio) for real-time risk scoring demonstrations.

## Evaluation Metrics

| Criterion | What We Measure |
|-----------|-----------------|
| Pipeline Completeness | Modular ingestion of raw UCI data, programmatic imputation of sensor logs, and reproducible train/validation/test splits |
| Predictive Performance | Macro F1-Score that significantly outperforms a naive baseline, capturing rare high-impact anomalies |
| Model Interpretability | Feature importance or SHAP value plots explaining which variables drive risk flags for business audiences |
| Professional Handoff | Clean repository, well-commented code, data dictionary, and a final presentation translating findings into business insights |

## Timeline

| Month | Milestone | Key Activities |
|-------|-----------|----------------|
| September | Technical scoping document | Deconstruct the business problem, initialize coding environments, define team roles and task distributions, confirm initial data loading |
| October | Modular preprocessing script | Clean the raw dataset, engineer time-series features, implement programmatic imputation, produce reproducible train/validation/test splits |
| November | Final model, repository, and presentation | Train and tune models, serialize model artifacts, generate SHAP plots and a validation leaderboard, finalize a production-grade GitHub repo, deliver a live presentation to leadership |

## Repository Structure

```
.
├── README.md
├── data/
│   ├── raw/              # Original UCI dataset files
│   └── processed/        # Cleaned, feature-engineered outputs
├── notebooks/            # Exploratory analysis and prototyping
├── src/
│   ├── ingestion.py      # Data loading from UCI repository
│   ├── preprocessing.py  # Cleaning, imputation, scaling
│   ├── features.py       # Time-series feature engineering
│   ├── train.py          # Model training and hyperparameter tuning
│   ├── evaluate.py       # Metrics, SHAP plots, leaderboard generation
│   └── predict.py        # Inference on new observations
├── models/               # Serialized model artifacts
├── reports/              # Figures, SHAP plots, presentation materials
├── requirements.txt
└── .gitignore
```

## Getting Started

### Prerequisites

- Python 3.10+
- pip or conda

### Installation

```bash
git clone <repository-url>
cd climate-risk-modeling
pip install -r requirements.txt
```

### Running the Pipeline

```bash
# 1. Download and load raw data
python src/ingestion.py

# 2. Clean, impute, and split
python src/preprocessing.py

# 3. Engineer time-series features
python src/features.py

# 4. Train and tune models
python src/train.py

# 5. Evaluate and generate SHAP plots
python src/evaluate.py
```

## Tech Stack

- **Data processing:** pandas, NumPy, scikit-learn
- **Modeling:** XGBoost or LightGBM (Gradient Boosted Trees)
- **Interpretability:** SHAP
- **Stretch (deep learning):** PyTorch (LSTM)
- **Stretch (dashboard):** Streamlit or Gradio

## Team

*Roles and assignments to be defined in the September scoping document.*

## License

TBD
