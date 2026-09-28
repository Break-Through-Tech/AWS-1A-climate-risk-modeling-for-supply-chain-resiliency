import os
import pandas as pd



def process_dataset(filepath):
    print(f"Processing {filepath}...")
    df = pd.read_csv(filepath)

    # In tao-all2, identify buoys by date resets
    if "standardized_date" in df.columns:
        date_dt = pd.to_datetime(df["standardized_date"])
        is_new_buoy = date_dt.diff() < pd.Timedelta(days=0)
        df["buoy_segment_id"] = is_new_buoy.cumsum()
    # In elnino, a 'buoy' column already exists
    elif "buoy" in df.columns:
        df["buoy_segment_id"] = df["buoy"]
    else:
        raise ValueError(f"Unknown format for {filepath}: missing date and buoy columns.")

    # Create descriptive output filename: e.g. tao-all2-tagged.csv
    base_dir = os.path.dirname(filepath)
    base_name = os.path.basename(filepath).replace("-cleaned.csv", "").replace(".csv", "")
    output_filepath = os.path.join(base_dir, f"{base_name}-tagged.csv")

    df.to_csv(output_filepath, index=False)
    print(f"[OK] Saved {output_filepath} with {df['buoy_segment_id'].nunique()} unique buoys.")
    return output_filepath


def main():
    datasets = [
        "data/processed/elnino-cleaned.csv",
        "data/processed/tao-all2-cleaned.csv",
    ]

    for dataset in datasets:
        process_dataset(dataset)


if __name__ == "__main__":
    main()
