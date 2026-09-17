import pandas as pd
import numpy as np 
import os


def main():
    filename = os.path.join(os.getcwd(), "data", "tao-all2.csv")
    df = pd.read_csv(filename)
    nan_count = np.sum(df.isnull(), axis=0)
    print(nan_count)
    print(df.head())
    print(f"Pre-cleaning shape: {df.shape}")

    # Date standardization and extraction of year (ex. 800307 -> 1980-03-07)
    df['standardized_date'] = pd.to_datetime(df['date'].astype(str), format='%y%m%d')
    df['year'] = df['standardized_date'].dt.year
    df.drop(columns=['date'], inplace=True)

    df = df.dropna(subset=['ss_temp']).reset_index(drop=True).copy()

    features = ['zonal_wind', 'meridional_wind', 'air_temp']
    df[features] = df[features].ffill(limit=3).bfill(limit=1)

    mean_by_month = df.groupby('month')[features].transform('mean')
    df[features] = df[features].fillna(mean_by_month)

    """Humidity Handling: 
        - Post-1989: fill record gaps with the mean humidity for that month
        - Pre-1989: fill record gaps with placeholder value (0)"""
    monthly_humidity_mean = df.groupby('month')['humidity'].transform('mean')
    post_1989_humidity = df['year'] >= 1989
    df.loc[post_1989_humidity, 'humidity'] = df.loc[post_1989_humidity, 'humidity'].fillna(monthly_humidity_mean)
    df['humidity'] = np.where(df['year'] < 1989, 0, df['humidity'])

    #Verify all missing values have been handled
    print(df.isnull().sum())

    output_filename = os.path.join(os.getcwd(), "data", "tao-all2-cleaned.csv")
    df = df.round(2)
    df.to_csv(output_filename, index=False)

    print(f"Post-cleaning shape: {df.shape}")

if __name__ == "__main__":
    main()