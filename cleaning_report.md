# Data Cleaning & Reduction Report
**Academic Project: Crime Hotspot Visualization using Crime and Demographic Data**

This report details the data analysis, cleaning, columns kept/removed, missing value strategies, and sampling methodologies implemented in `clean_data.py` to prepare the raw datasets for geospatial analysis.

---

## 1. Chicago Crime Dataset Analysis & Cleaning

### Columns Selection
* **Columns Kept:**
  - `ID`: Primary key for crime events.
  - `Case Number`: Unique identifier for tracking cases.
  - `Date`: Timestamp of occurrence (crucial for temporal analysis).
  - `Primary Type`: The crime category (crucial for type-based hotspots).
  - `Latitude`: Y-coordinate for geographic visualization.
  - `Longitude`: X-coordinate for geographic visualization.
  - `District`: Police District (essential for regional grouping and administrative division hotspots).
  - `Arrest`: Indicates if an arrest was made.
  - `Domestic`: Indicates if the crime was domestic-related.

* **Columns Removed (Irrelevant Columns):**
  - `Block`, `IUCR`, `Description`, `Location Description`, `Beat`, `Ward`, `Community Area`, `FBI Code`, `X Coordinate`, `Y Coordinate`, `Year`, `Updated On`, `Location`.
  - **Reason for Removal:** These columns are either duplicates of latitude/longitude (`X Coordinate`, `Y Coordinate`, `Location`), highly granular text details (`Block`, `Description`), or redundant administrative regions (`Beat`, `Ward`) that increase data footprint without adding visual value for a general hotspot map.

### Data Cleaning Actions
- **Duplicate Removal:** All duplicate records matching on `ID` were discarded.
- **Geographic Bounding Box Filter:** Records with coordinates outside Chicago's administrative bounds (Latitude: `[41.64, 42.03]`, Longitude: `[-87.85, -87.52]`) were filtered out to remove erroneous data points.
- **Null Value Treatment:** Records with missing `Latitude`, `Longitude`, or `Primary Type` (Crime Type) were dropped, as they cannot be mapped.

### Dataset Reduction & Geographically Stratified Sampling
- **Goal:** Downsample the massive 1.78 GB dataset containing millions of rows to a light, representative set of **8,000 rows** suited for a fast, responsive 2-day academic study.
- **Methodology:** We utilized **Geographically Stratified Sampling** based on `District`. By sampling proportionally within each Police District, we preserved the real-world geographic distribution of crimes and ensured that neighborhoods with higher crime rates are proportionally represented, without omitting quieter areas.
- **Git LFS Handling:** If the raw file is a Git LFS pointer, the script generates **synthetic** points around police district centers and records `crime_source: synthetic` in `data/cleaned/data_manifest.json`. That extract is **not** statistically identical to the official Chicago Crime dataset.
- **Provenance:** `sampled_real`

### Crime Dataset Metrics
| Metric | Value |
| :--- | :--- |
| **Initial Raw Rows** | 8,640,635 |
| **Cleaned & Sampled Rows** | 8,000 |
| **Total Rows Removed / Filtered Out** | 8,632,635 |

---

## 2. Demographic (US Census) Dataset Analysis & Cleaning

### Columns Selection
* **Columns Kept:**
  - `TractId`: Unique Census Tract Identifier.
  - `State` & `County`: Area/Region descriptors.
  - `TotalPop`: Population count.
  - `Income` & `IncomePerCap`: Economic and household income features.
  - `Professional`: Percentage of residents working in professional/scientific/arts/management roles (Education & Socioeconomic proxy).
  - `Unemployment`: Unemployment rate.

* **Columns Removed (Irrelevant Columns):**
  - `Men`, `Women`, `Hispanic`, `White`, `Black`, `Native`, `Asian`, `Pacific`, `VotingAgeCitizen`, `IncomeErr`, `IncomePerCapErr`, `Poverty`, `ChildPoverty`, `Service`, `Office`, `Construction`, `Production`, `Drive`, `Carpool`, `Transit`, `Walk`, `OtherTransp`, `WorkAtHome`, `MeanCommute`, `Employed`, `PrivateWork`, `PublicWork`, `SelfEmployed`, `FamilyWork`.
  - **Reason for Removal:** Granular demographic sub-categories, commuting patterns, and specific transportation modes were removed to maintain a clean focus on density (Population), wealth (Income), education (Professional occupation proxy), and economic hardship (Unemployment), which are the primary demographic variables correlated with crime hotspot analysis.

### Data Cleaning Actions
- **Duplicate Removal:** Removed duplicate rows.
- **Geographic Focus Filter:** Filtered exclusively for the Chicago Metropolitan Area (`State == 'Illinois'` and `County == 'Cook County'`) to align the demographics dataset directly with the study area of the crime dataset.
- **Null Value Treatment:**
  - Rows with missing `TotalPop` were dropped.
  - Missing values in `Income`, `IncomePerCap`, `Professional`, and `Unemployment` were imputed using the median of Cook County to preserve neighborhood statistics.

### Demographic Dataset Metrics
| Metric | Value |
| :--- | :--- |
| **Initial Raw Rows** | 74,001 |
| **Cleaned & Filtered Rows (Illinois, Cook County)** | 1,319 |
| **Total Rows Removed / Filtered Out** | 72,682 |

Census tract extract written to `data/cleaned/demographic_cleaned.csv`.

---

## 3. Summary of Outputs Generated
1. **Cleaned Crime Data:** `data/cleaned/crime_cleaned.csv` (8,000 rows, source `sampled_real`)
2. **Cleaned Demographic Data:** `data/cleaned/demographic_cleaned.csv` (1,319 rows)
3. **Provenance manifest:** `data/cleaned/data_manifest.json`
4. **Data Cleaning Pipeline:** `clean_data.py`
