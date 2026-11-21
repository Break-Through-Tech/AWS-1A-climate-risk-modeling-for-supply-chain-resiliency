"""Copy the EDA figures shown on the website out of the team's notebooks.

The charts are the exact images saved in the notebook outputs, so the website
shows the team's real EDA. Re-run this after a notebook is re-run and saved:

    cd website
    python3 scripts/export_eda_figures.py

Each figure is found by a piece of text from the cell that draws it (usually
the chart title), not by cell position, so adding cells to a notebook does
not break the export.
"""

import base64
import json
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
NOTEBOOKS = REPO_ROOT / "notebooks"
OUTPUT_DIR = pathlib.Path(__file__).resolve().parents[1] / "public" / "eda"

# (output file name, notebook, text in the plotting cell, which image in that cell)
FIGURES = [
    # Main story on the EDA page
    ("monthly-ssta", "eda_temporal_analysis", "Monthly Average SSTAs", 0),
    ("ssta-by-longitude-year", "eda_space_and_data_quality", "Mean ssta by longitude and year", 0),
    ("class-distribution-splits", "eda_temporal_analysis", "Climate Risk Class Distribution Across Data Splits", 0),
    ("ssta-autocorrelation", "eda_temporal_analysis", "Monthly SSTA Autocorrelation", 0),
    ("wind-leads-sst", "eda_visuals", "Western Pacific wind anomaly vs. later", 0),
    # "More charts" section
    ("missing-data-humidity", "eda_space_and_data_quality", "white ok, orange NaN, black no row", 0),
    ("missing-data-ssta-lag6", "eda_space_and_data_quality", "white ok, orange NaN, black no row", 1),
    ("class-share-longitude-train", "eda_space_and_data_quality", "target_risk share by longitude", 0),
    ("class-share-longitude-val", "eda_space_and_data_quality", "target_risk share by longitude", 1),
    ("equatorial-hovmoller", "eda_visuals", "equator (2°S–2°N)", 0),
    ("ssta-feature-correlations", "eda_temporal_analysis", "Correlation of Existing SSTA Features with Future SSTA", 0),
    ("climate-feature-correlations", "eda_temporal_analysis", "Climate Feature Correlations with Future SSTA", 0),
    ("mutual-information", "eda_visuals", "Which features tell us about the class 3 months ahead?", 0),
]


def images_in(cell):
    """Return the base64 PNG outputs of a notebook cell, in order."""
    images = []
    for output in cell.get("outputs", []):
        png = output.get("data", {}).get("image/png")
        if png:
            images.append("".join(png) if isinstance(png, list) else png)
    return images


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    notebooks = {}
    missing = []

    for name, notebook, marker, index in FIGURES:
        if notebook not in notebooks:
            path = NOTEBOOKS / f"{notebook}.ipynb"
            notebooks[notebook] = json.loads(path.read_text(encoding="utf-8"))["cells"]

        matches = [
            cell for cell in notebooks[notebook]
            if cell["cell_type"] == "code" and marker in "".join(cell["source"]) and images_in(cell)
        ]
        images = images_in(matches[0]) if matches else []
        if index >= len(images):
            missing.append(f"{name} ({notebook}: '{marker}')")
            continue

        (OUTPUT_DIR / f"{name}.png").write_bytes(base64.b64decode(images[index]))
        print(f"wrote public/eda/{name}.png")

    if missing:
        sys.exit("Could not find these figures. Is the notebook run and saved with outputs?\n  "
                 + "\n  ".join(missing))


if __name__ == "__main__":
    main()
