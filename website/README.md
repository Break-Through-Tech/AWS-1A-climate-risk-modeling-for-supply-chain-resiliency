# ENSO Risk Explorer website

The project website: a static React site (Vite) with no backend. Pages follow the Figma design
("Website – Deep ocean"). Right now the **EDA** page is built; Home, Buoy map, Forecast and Results
show a "coming soon" placeholder.

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

## Build for hosting

```bash
npm run build
```

This writes a static site to `website/dist/`, which can be hosted anywhere static files are served
(GitHub Pages, AWS S3/Amplify). Pages use hash URLs (`/#/eda`), so no server rewrite rules are needed.
