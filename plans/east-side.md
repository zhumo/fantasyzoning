# East Side Data Pipeline - Design Proposal

## Problem Statement

The Fantasy Zoning app currently only supports parcels covered by the Family Zoning Plan (FZP), which covers ~92,000 parcels primarily on the western side of San Francisco. The remaining ~60,000 parcels on the east side are displayed on the map but cannot have the City Economist's model applied to them because they lack the required parcel attributes in `fzp-zoning.csv`.

The City Economist's model itself is calibrated on ALL of San Francisco (2004-2024 housing production data citywide), so it can theoretically be applied to any parcel. The limitation is purely a data availability issue.

## Goal

Build an auditable data transformation pipeline that:
1. Takes raw data from authoritative sources (SF Open Data, Assessor's Office, Planning Department)
2. Transforms and joins the data into the required model input format
3. Outputs datasets ready for the frontend
4. Documents every transformation step for auditability (via Jupyter notebook)

## Primary Source Documents

These files come from external sources and are treated as ground truth:

| File | Source | Description |
|------|--------|-------------|
| `data/fzp-zoning.csv` | City Economist's Office | Model inputs for ~92k FZP parcels. This is the authoritative source we validate against. |
| `data/prob-redevelopment-regression-weights.csv` | City Economist's Office | Logistic regression coefficients |
| `data/num-units-regression-weights.csv` | City Economist's Office | Linear regression coefficients |
| `data/construction-and-price-scenarios.csv` | City Economist's Office | Macro scenario inputs (costs, prices by year) |

## Current Data Flow (Undocumented)

```
City Economist's Office → data/fzp-zoning.csv (92k parcels)
??? (unknown sources)    → data/parcels.csv, data/parcels.geojson
                              ↓
                         web/public/data/* (served to frontend)
```

## Proposed Architecture

**Hybrid approach**: Modular scripts for reusability + Jupyter notebook as orchestrator for auditability.

```
pipeline/
├── raw/                        # Downloaded source files (GITIGNORED - large files)
│   ├── sf_parcels.geojson      # ~60MB
│   ├── assessor_roll.csv       # ~100MB+
│   ├── zoning_districts.geojson
│   ├── height_districts.geojson
│   ├── historic_resources.csv
│   └── planning_districts.geojson
│
├── output/                     # Final outputs (checked in)
│   ├── model_inputs.csv        # All parcels with model columns
│   └── validation_report.csv   # Comparison to fzp-zoning.csv
│
├── scripts/
│   ├── fetch_sources.py        # Download from SF Open Data APIs
│   ├── clean_parcels.py        # Standardize parcel base data
│   ├── clean_buildings.py      # Extract building sqft from assessor
│   ├── clean_zoning.py         # Parse zoning codes and heights
│   ├── clean_historic.py       # Parse historic status
│   ├── derive_zoning_dummies.py    # Map zoning codes → model dummies
│   ├── derive_district_dummies.py  # Spatial join → district dummies
│   ├── derive_envelope.py      # Calculate Area_1000, Env_1000_Area_Height
│   ├── join_model_inputs.py    # Combine all into final output
│   └── deploy.sh               # Copy outputs to web/public/data/
│
├── data_pipeline.ipynb         # Orchestrator notebook
└── README.md                   # How to run
```

### Raw Data Strategy

Raw source files are **gitignored** and downloaded on-demand via `fetch_sources.py`. Reasons:
- Files are large (100MB+), exceeding GitHub's file size limits
- SF Open Data updates over time - better to fetch fresh than store stale copies
- Anyone can reproduce by running the fetch script
- Download URLs are documented in the script for auditability

### Deployment Strategy

When ready to update the frontend, run `scripts/deploy.py` which copies from `pipeline/output/` to `web/public/data/`. This is explicit and avoids symlink issues (cross-platform compatibility, build tools not following symlinks, keeping experimental data separate during development).

## How the Notebook Works

The notebook calls each script in sequence, displays intermediate results, and provides narrative documentation:

```python
# %% [markdown]
# ## 1. Fetch Raw Data
# Download parcel geometries and assessor data from SF Open Data.
# Sources are documented in the script.

# %%
from scripts.fetch_sources import fetch_all
fetch_all(output_dir="raw/")

# %%
!ls -lh raw/

# %% [markdown]
# ## 2. Clean Parcels
# Standardize mapblklot format, drop retired parcels, extract area.

# %%
from scripts.clean_parcels import clean_parcels
parcels_df = clean_parcels("raw/sf_parcels.geojson")
print(f"Total parcels: {len(parcels_df):,}")
parcels_df.head()

# %% [markdown]
# ## 3. Clean Buildings
# Extract building square footage from assessor roll.

# %%
from scripts.clean_buildings import clean_buildings
buildings_df = clean_buildings("raw/assessor_roll.csv")
print(f"Parcels with building data: {len(buildings_df):,}")
buildings_df.describe()

# ... continues for each step

# %% [markdown]
# ## 8. Validate Against FZP Data
# Compare our derived values to the City Economist's fzp-zoning.csv

# %%
fzp_df = pd.read_csv("../data/fzp-zoning.csv")
# Compare overlapping parcels, show discrepancies
```

Each script:
- Does one thing
- Returns a DataFrame
- Has no side effects (doesn't write files unless explicitly told)

The notebook:
- Calls scripts in order
- Shows intermediate outputs (`.head()`, `.describe()`, value counts)
- Adds markdown explanations of what's happening and why
- Makes the full pipeline readable top-to-bottom
- Serves as the primary verification method (visual inspection)

## Required Model Columns

From the City Economist's model (see `plans/done/regression.md`), each parcel needs:

### Probability Model Inputs
| Column | Description | Source |
|--------|-------------|--------|
| `BlockLot` | Unique identifier | Parcels dataset |
| `Height_Ft` | Allowable height limit | Height Districts |
| `Area_1000` | Lot area in 1000 sqft | Parcels dataset |
| `Env_1000_Area_Height` | Area_1000 * Height_Ft / 10 | Derived |
| `Bldg_SqFt_1000` | Existing building sqft / 1000 | Assessor Roll |
| `Res_Dummy` | 1 if residential use | Land Use |
| `Historic` | 1 if historic resource | Historic Resources |
| `SDB_2016_5Plus` | **Set to 0 for now** (simplification) | — |
| `zp_*` | Zoning type dummies (8 categories) | Derived from zoning |
| `DIST_*` | Planning district dummies (14 categories) | Planning Districts |

### Units Model Inputs
| Column | Description | Source |
|--------|-------------|--------|
| `Env_1000_Area_Height` | Same as above | Derived |
| `SDB_2016_5Plus_EnvFull` | **Set to 0 for now** | — |
| `Zoning_DR_EnvFull` | Density-restricted dummy * Env | Derived |

### SDB Simplification

For this initial version, we set all SDB-related fields to 0:
- `SDB_2016_5Plus = 0`
- `SDB_2016_5Plus_EnvFull = 0`

This is conservative—it slightly underestimates development probability and unit counts. We can add proper SDB eligibility logic in a future iteration once we understand the zoning-based unit capacity rules.

## Key Data Sources

### 1. Parcels (Geometry + Base Attributes)
- **Source**: SF Open Data - "Parcels - Active and Retired"
- **URL**: https://data.sfgov.org/Geographic-Locations-and-Boundaries/Parcels-Active-and-Retired/acdm-wktn
- **Key fields**: mapblklot, shape_area, geometry

### 2. Assessor Secured Roll (Building Info)
- **Source**: SF Assessor's Office
- **URL**: https://data.sfgov.org/Housing-and-Buildings/Assessor-Historical-Secured-Property-Tax-Rolls/wv5m-vpq2
- **Key fields**: Block/Lot, Building Area, # Units

### 3. Zoning Districts
- **Source**: SF Planning - Zoning Map
- **URL**: https://data.sfgov.org/Geographic-Locations-and-Boundaries/Zoning-Map-Zoning-Districts/mici-sct2
- **Key fields**: mapblklot, zoning

### 4. Height Districts
- **Source**: SF Planning - Height and Bulk Districts
- **URL**: https://data.sfgov.org/Geographic-Locations-and-Boundaries/Zoning-Map-Height-and-Bulk-Districts/gc9v-yvrj
- **Key fields**: mapblklot, height limit

### 5. Historic Resources
- **Source**: SF Planning - Historic Resource Inventory
- **URL**: (need to identify)
- **Key fields**: mapblklot, status

### 6. Planning Districts
- **Source**: SF Planning
- **Key fields**: geometry → mapblklot spatial join → district name

## Zoning Classification Logic

The model uses 8 aggregate zoning categories. From the City Economist's appendix (pages 35-37):

```python
ZONING_MAPPING = {
    'zp_RH1': ['RH-1', 'RH-1(D)', 'RH-1(S)', ...],  # Single family
    'zp_RH2': ['RH-2', ...],                         # Two family
    'zp_RH3_RM1': ['RH-3', 'RM-1', ...],            # 3-family / residential mixed
    'zp_OfficeComm': ['C-2', 'C-3-G', 'C-3-O', ...], # Commercial
    'zp_DRMulti_RTO': ['NC-1', 'NC-2', 'NC-3', ...], # Density-restricted multi
    'zp_FBDMulti_RTO': ['NCT', 'RTO', 'DTR', ...],   # Form-based multi
    'zp_PDRInd': ['M-1', 'M-2', 'PDR-1', ...],       # Industrial
    'zp_Public': ['P', 'Public', ...],               # Public
    'zp_Redev': ['HP-RA', 'MB-RA', ...],            # Redevelopment
}
```

A parcel with no match defaults to `zp_RH1` (all dummies = 0).

## District Classification Logic

The model uses 14 planning districts as dummies, with Downtown as the omitted reference:

```python
DISTRICT_DUMMIES = [
    'DIST_SBayshore', 'DIST_BernalHts', 'DIST_Scentral', 'DIST_Central',
    'DIST_BuenaVista', 'DIST_Northeast', 'DIST_WestAddition', 'DIST_SOMA',
    'DIST_InnerSunset', 'DIST_Richmond', 'DIST_Ingleside', 'DIST_OuterSunset',
    'DIST_Marina', 'DIST_Mission'
]
```

Downtown parcels have all district dummies = 0.

## Implementation Phases

### Phase 1: Document Current State
- Reverse-engineer where current `parcels.csv` and `parcels.geojson` came from
- Document the ~320 parcels in fzp-zoning.csv that don't match parcels.csv

### Phase 2: Build Raw Data Collection
- Create `fetch_sources.py` to download from SF Open Data APIs
- Document download URLs in the script
- Add `raw/` to `.gitignore`

### Phase 3: Build Cleaning Scripts
- `clean_parcels.py`: Standardize mapblklot, extract area
- `clean_buildings.py`: Extract building sqft from assessor
- `clean_zoning.py`: Parse zoning codes and height limits
- `clean_historic.py`: Parse historic status

### Phase 4: Build Derivation Scripts
- `derive_zoning_dummies.py`: Map zoning codes → 8 dummy columns
- `derive_district_dummies.py`: Spatial join → 14 dummy columns
- `derive_envelope.py`: Calculate Area_1000, Env_1000_Area_Height, etc.

### Phase 5: Join and Validate
- `join_model_inputs.py`: Combine all DataFrames into final output
- Compare output to `fzp-zoning.csv` for FZP parcels (visual inspection in notebook)
- Generate validation report showing any discrepancies

### Phase 6: Frontend Integration
- Create `deploy.sh` to copy outputs to `web/public/data/`
- Update frontend to use new `model_inputs.csv`
- Add UI to toggle FZP-only vs. all-parcels mode
- Update projections to include east side parcels

## Open Questions

1. **Missing building data**: Some parcels may lack assessor data. Impute as 0? Exclude?
2. **Historic data completeness**: Is the historic inventory complete citywide?
3. **Performance**: Will ~153k parcels be too slow for client-side calculations?

## Dependencies

- Python 3.10+
- pandas, geopandas
- requests (for API fetching)
- jupyter

## Success Criteria

1. Notebook runs end-to-end and produces `model_inputs.csv`
2. Output matches existing FZP data for overlapping parcels (visual inspection)
3. East side parcels have valid model inputs
4. Total expected units for east side can be calculated
5. All transformations are visible and auditable in the notebook
