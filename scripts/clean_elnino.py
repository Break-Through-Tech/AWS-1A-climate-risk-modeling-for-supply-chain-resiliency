import pandas as pd
import numpy as np 
import os


def main():
    filename = os.path.join(os.getcwd(), "data", "elnino.csv")
    df = pd.read_csv(filename)
    nan_count = np.sum(df.isnull(), axis=0)
    print(nan_count)
    print(df.head())
    print(f"Pre-cleaning shape: {df.shape}")

    df = df.dropna(subset=['ss_temp'])
    features = ['zonal_wind', 'meridional_wind', 'air_temp', 'humidity']
    # Fill missing values for each feature based on the buoy's data, with a limit of 3 forward fills and 1 backward fill
    df[features] = (df.groupby('buoy')[features].ffill(limit=3).bfill(limit=1))
    entire_means = df[features].mean()
    # Fill any remaining missing values with the mean of the entire dataset for that feature
    df[features] = df[features].fillna(entire_means)

    print(df.isnull().sum())

    output_filename = os.path.join(os.getcwd(), "data", "elnino-cleaned.csv")
    df = df.round(2) 
    df.to_csv(output_filename, index=False)

    print(f"Post-cleaning shape: {df.shape}")

if __name__ == "__main__":
    main()