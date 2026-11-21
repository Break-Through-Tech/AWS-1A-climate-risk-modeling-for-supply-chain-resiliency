# ENSO Risk Explorer website

The project website: a static React site (Vite) with no backend. Pages follow the Figma design
("Website – Deep ocean"). Right now the **EDA** and **Forecast** pages are built; Home, Buoy map and
Results show a "coming soon" placeholder.

## Run it locally

Needs Node 18+.

```bash
cd website
npm install
npm run dev
```

Then open http://localhost:5180/#/eda.

## Update the EDA charts

The EDA page shows the team's real charts, copied straight from the saved outputs of the
notebooks in `notebooks/`. After re-running and saving an EDA notebook, refresh the images:

```bash
cd website
npm run export-eda
```

`scripts/export_eda_figures.py` lists which chart goes where. The page text lives in
`src/content/eda.js`.

## Update the forecasts

The Forecast page reads `public/forecasts/forecasts.json`: the saved XGBoost residual model's forecast for
every validation buoy-month (1994–96), with the calibrated tier, what actually happened, the
persistence guess, and the top 3 SHAP reasons. The steps match `model_xgboost_training.ipynb` and
`model_explainability.ipynb`, and the script prints the macro F1 so you can check it (0.3579).

After retraining the model, regenerate it with the repo's Python environment. This needs
`data/processed/features-val.csv` and `models/best_xgboost_residual_model.json`, which are not in git:

```bash
cd website
../.venv/bin/python scripts/export_forecasts.py
```

## Build for hosting

```bash
npm run build
```

This writes a static site to `website/dist/`, which can be hosted anywhere static files are served
(GitHub Pages, AWS S3/Amplify). Pages use hash URLs (`/#/eda`), so no server rewrite rules are needed.
