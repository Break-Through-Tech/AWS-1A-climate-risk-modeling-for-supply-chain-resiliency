# How to Run

## Repository Structure

```
.
├── README.md
├── Challenge-Project-Overview.md                  # Project brief
├── Getting-Started-for-Fellows.md                 # Onboarding notes
├── requirements.txt
├── data/                                          # Not tracked by git (see step 1 below)
│   ├── el+nino.zip                                # Raw UCI download
│   ├── raw/                                       # Extracted UCI files (.gz data + .col column names)
│   └── processed/                                 # Pipeline outputs: train/val/test CSVs
├── notebooks/
│   └── data_cleaning_preprocessing_pipeline.ipynb # Main end-to-end pipeline
├── scripts/                                       # Earlier standalone versions of pipeline steps
│   ├── data_unzipping.py                          # Extract the zip and convert raw files to CSV
│   ├── clean_elnino.py                            # Clean the 14-day elnino sample
│   ├── clean_taoall2.py                           # Clean the full tao-all2 dataset
│   ├── id_buoy_readings.py                        # Tag buoy deployments (buoy_segment_id)
│   └── bin_nominal.py                             # Snap coordinates to TAO mooring sites (site_id)
└── docs/                                          # Design notes for each pipeline stage
    ├── HOW_TO_RUN.md
    ├── DATA_INGESTION.md
    ├── DATA_CLEANING.md
    ├── DATA_FEATURE_ENGINEERING.md
    └── DATA_NORMALIZATION_STANDARDIZATION.md
```

## Steps

### 1. Add the data

The `data/` folder is not committed. Download the zip from the [UCI El Nino dataset page](https://drive.google.com/drive/folders/1oh9fEPoRcjEXHFZU2TpNL7YQATRBXgXP) and save it as `data/el+nino.zip`.

### 2. Run the pipeline

```bash
jupyter notebook notebooks/data_cleaning_preprocessing_pipeline.ipynb
```

Run all cells top to bottom. The notebook extracts the zip, cleans the data, builds the target and time-series features, splits chronologically, standardizes, and saves six CSVs to `data/processed/`:

- `tao-all2-train.csv`, `tao-all2-val.csv`, `tao-all2-test.csv`
- `elnino-train.csv`, `elnino-val.csv`, `elnino-test.csv`
