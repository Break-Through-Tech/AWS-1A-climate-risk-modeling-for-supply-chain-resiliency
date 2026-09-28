import os
import numpy as np
import pandas as pd

# Official NOAA PMEL TAO Array Mooring Stations (lat, lon)
# Reference: McPhaden et al. (1998), Bulletin of the American Meteorological Society
OFFICIAL_TAO_SITES = [
    # Equator (0N)
    (0, -110), (0, -125), (0, -140), (0, -155), (0, -170), (0, 180),
    (0, 170), (0, 165), (0, 160), (0, 156), (0, 147), (0, 143), (0, -95),
    # 2N
    (2, -110), (2, -125), (2, -140), (2, -155), (2, -170), (2, 180),
    (2, 165), (2, 156), (2, 147), (2, 137), (2, -95),
    # 2S
    (-2, -110), (-2, -125), (-2, -140), (-2, -155), (-2, -170), (-2, 180),
    (-2, 165), (-2, 156), (-2, -95),
    # 5N
    (5, -110), (5, -125), (5, -140), (5, -155), (5, -170), (5, 180),
    (5, 165), (5, 156), (5, 147), (5, 137), (5, -95),
    # 5S
    (-5, -110), (-5, -125), (-5, -140), (-5, -155), (-5, -170), (-5, 180),
    (-5, 165), (-5, 156), (-5, -95),
    # 8N & 9N
    (8, -110), (8, -125), (8, -140), (8, -155), (8, -170), (8, 180),
    (8, 165), (8, 156), (8, -95), (9, -140),
    # 8S
    (-8, -110), (-8, -125), (-8, -155), (-8, -170), (-8, 180),
    (-8, 165), (-8, -95)
]


def haversine_vectorized(lat1, lon1, lat2_arr, lon2_arr):
    """
    Computes Great Circle distance (km) on a spherical Earth,
    correctly handling circular antimeridian (-180 / +180) wraparound.
    """
    R = 6371.0  # Earth's mean radius in km
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2_arr)
    dphi = np.radians(lat2_arr - lat1)
    # Circular wraparound for longitude differences on a sphere
    dlambda = np.radians((lon2_arr - lon1 + 180.0) % 360.0 - 180.0)

    a = np.sin(dphi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0) ** 2
    return 2.0 * R * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))


def process_dataset(filepath):
    print(f"\nProcessing {filepath}...")
    df = pd.read_csv(filepath)

    sites_arr = np.array(OFFICIAL_TAO_SITES)

    # Process unique coordinate pairs for speed
    unique_coords = df[["latitude", "longitude"]].drop_duplicates().copy()

    def find_nearest_site(row):
        dists = haversine_vectorized(
            row["latitude"], row["longitude"], sites_arr[:, 0], sites_arr[:, 1]
        )
        best_idx = np.argmin(dists)
        nom_lat, nom_lon = sites_arr[best_idx]
        site_id = f"{int(nom_lat)}_{int(nom_lon)}"
        return nom_lat, nom_lon, site_id

    results = unique_coords.apply(find_nearest_site, axis=1)
    unique_coords["nominal_lat"] = [r[0] for r in results]
    unique_coords["nominal_lon"] = [r[1] for r in results]
    unique_coords["site_id"] = [r[2] for r in results]

    # Merge back to the full dataset
    df = df.merge(unique_coords, on=["latitude", "longitude"], how="left")

    # Rename output: e.g. tao-all2-tagged.csv -> tao-all2-binned.csv
    output_filepath = filepath.replace("-tagged.csv", "-binned.csv")
    df.to_csv(output_filepath, index=False)
    print(
        f"[OK] Saved {output_filepath} ({len(df)} rows across {df['site_id'].nunique()} unique sites)."
    )
    return output_filepath


def main():
    datasets = [
        "data/processed/elnino-tagged.csv",
        "data/processed/tao-all2-tagged.csv",
    ]

    for dataset in datasets:
        process_dataset(dataset)


if __name__ == "__main__":
    main()

