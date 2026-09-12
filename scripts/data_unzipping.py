import os
import zipfile
import pandas as pd
import shutil


COLUMN_NAME_MAP = {
    "zon.winds": "zonal_wind",
    "mer.winds": "meridional_wind",
    "air temp.": "air_temp",
    "s.s.temp.": "ss_temp",
}


def read_column_names(col_file):
    """Read non-empty raw column names from a UCI column definition file."""
    with open(col_file, "r") as file:
        return [line.strip() for line in file if line.strip()]


def normalize_column_names(columns):
    """Map UCI column labels to the canonical names used by the README."""
    return [COLUMN_NAME_MAP.get(column, column) for column in columns]


def setup_folder_structure():
    """
    Sets up the folder structure for the project.
    Splits them into the raw and processed folders.
    """
    dirs = ["raw", "processed"]

    for folder in dirs:
        os.makedirs(folder, exist_ok=True)

def extract_zip(zip_path, extract_to):
    """
    Extracts the original zip files in the specified folder to the target folder.
    
    Parameters:
    zip_path (str): The path to the zip file.
    extract_to (str): The folder where the contents will be extracted.
    """
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)

def find_file(dir, filename):
    """
    Finds a file recursively in the directory
    
    Parameters:
    dir (str): The directory to search in.
    filename (str): The name of the file to find.
    """
    for root, _, files in os.walk(dir):
        for file in files:
            if file == filename:
                return os.path.join(root, file)
    return None


def verify_csv(csv_path, expected_columns):
    """Verify a processed CSV's columns, missing values, and data types."""
    df = pd.read_csv(csv_path)
    dataset_name = os.path.basename(csv_path)

    if len(df.columns) != expected_columns:
        print(
            f"[ERROR] {dataset_name}: expected {expected_columns} columns, "
            f"but found {len(df.columns)}."
        )
        return False

    print(f"[OK] {dataset_name}: column count matches expected ({expected_columns}).")
    print(f"[INFO] {dataset_name}: found {df.isna().sum().sum()} missing values.")

    non_numeric_columns = df.select_dtypes(include=["object"]).columns.tolist()
    if non_numeric_columns:
        print(f"[WARNING] {dataset_name}: non-numeric columns: {non_numeric_columns}")
    else:
        print(f"[OK] {dataset_name}: all columns parsed as numeric types.")

    return True


def process_dataset(raw_dir, processed_dir, dataset_prefix, expected_columns):
    """
    Process a dataset (.gz) using the column definition (.col) and verify it against the expected columns.
    
    Parameters:
    raw_dir (str): The directory containing the raw dataset files.
    processed_dir (str): The directory where the processed dataset will be saved.
    dataset_prefix (str): The prefix of the dataset files to process.
    expected_columns (int): The expected number of columns for the dataset.
    """

    # Find the .gz and .col files
    gz_file = find_file(raw_dir, f"{dataset_prefix}.gz")
    if not gz_file:
        gz_file = find_file(raw_dir, f"{dataset_prefix}.dat.gz")

    col_file = find_file(raw_dir, f"{dataset_prefix}.col")

    if not gz_file or not col_file:
        print(f"Error: Could not find both {dataset_prefix}.gz and {dataset_prefix}.col in {raw_dir}")
        return

    print(f"=== Processing dataset: {dataset_prefix} ===")
    # The .col file is the source of truth for this dataset's raw layout.
    raw_columns = read_column_names(col_file)
    columns = normalize_column_names(raw_columns)

    # Read the .gz file into a DataFrame
    df = pd.read_csv(
        gz_file,
        compression="gzip",
        sep=r"\s+",
        header=None,
        names=columns,
        na_values=["."],
    )

    # Save the processed DataFrame to the processed directory
    processed_file_path = os.path.join(processed_dir, f"{dataset_prefix}.csv")
    df.to_csv(processed_file_path, index=False)
    print(f"[OK] Saved {processed_file_path} with {len(df)} rows.")
    verify_csv(processed_file_path, expected_columns)


def main():
    """Extract and process both UCI El Nino datasets."""
    project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    zip_path = os.path.join(project_dir, "data", "el+nino.zip")
    raw_dir = os.path.join(project_dir, "data", "raw")
    processed_dir = os.path.join(project_dir, "data", "processed")

    if not os.path.exists(zip_path):
        print(f"Error: Could not find {zip_path}")
        return

    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(processed_dir, exist_ok=True)
    extract_zip(zip_path, raw_dir)

    process_dataset(raw_dir, processed_dir, "elnino", expected_columns=9)
    process_dataset(raw_dir, processed_dir, "tao-all2", expected_columns=12)


if __name__ == "__main__":
    main()