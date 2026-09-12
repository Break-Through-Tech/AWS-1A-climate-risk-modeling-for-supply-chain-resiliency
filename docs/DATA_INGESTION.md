# Data Ingestion

## Schema decision

The UCI El Nino archive contains two related datasets with different schemas:

- `elnino`: 9 columns, including `buoy` and `day`
- `tao-all2`: 12 columns, including `obs`, `year`, `month`, `day`, and `date`

The `.col` file for each dataset is the source of truth for its raw column order. The smaller `elnino` file is a valid subset of the `tao-all2` schema; it does not contain `obs`, `year`, `month`, or `date`.

## Column normalization

The ingestion script preserves dataset-specific fields and normalizes shared UCI labels to the project names used in the README:

| Raw UCI name | Canonical name |
|--------------|----------------|
| `zon.winds` | `zonal_wind` |
| `mer.winds` | `meridional_wind` |
| `air temp.` | `air_temp` |
| `s.s.temp.` | `ss_temp` |

This keeps the original downloaded data unchanged while giving downstream analysis consistent names.

## Processing and validation

`scripts/data_unzipping.py` performs the following steps:

1. Extracts `data/el+nino.zip` into `data/raw`.
2. Reads each dataset's `.col` file.
3. Normalizes the column names.
4. Reads whitespace-separated compressed data and treats `.` as missing.
5. Writes normalized files to `data/processed`.
6. Calls `verify_csv()` to check the output column count, report missing values, and identify non-numeric columns.

Expected output schemas are 9 columns for `elnino` and 12 columns for `tao-all2`. The generated files passed these checks during initial processing:

- `elnino.csv`: 782 rows, 9 columns, 539 missing values
- `tao-all2.csv`: 178,080 rows, 12 columns, 151,330 missing values

Neither dataset currently includes a `subsurface_temp` column, so that feature should not be used until a source containing it is added.
