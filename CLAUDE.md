# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

See @README.md

## Running the Application

### Local Development

From the project root:

```bash
npm install
npm run dev
```

The app will open at http://localhost:5173

### Environment Setup

1. Copy `.env.example` to `.env`
2. Add your Mapbox token: `VITE_MAPBOX_TOKEN=pk.your_token_here`
3. Get a free token at https://account.mapbox.com/

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory, ready to deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## Architecture

### Technology Stack
- **Frontend**: Vue 3 + Vite
- **Mapping**: Mapbox GL JS
- **Data Processing**: Python (GeoPandas) - virtual environment in `.venv/`
- **Hosting**: Static (client-side only, no server)

### Data Flow

1. **Source data**: `data/` directory contains raw geometry and attribute files
2. **Served data**: `public/data/` contains files served to the frontend
3. **Frontend**: Vue.js loads geometry and attributes from `/data/`, joins them client-side by mapblklot, and renders in Mapbox

### App Structure

```
├── src/
│   ├── App.vue              - Root component (title: "Rezoner")
│   ├── components/
│   │   └── MapView.vue      - Map rendering and parcel interaction
│   ├── main.js              - App entry point
│   └── style.css            - Global styles
├── public/
│   └── data/
│       ├── parcels.geojson      - Parcel geometries (64MB, 150k parcels)
│       ├── parcels-overlay.csv  - Parcel attributes (17MB)
│       ├── parcels-model.csv    - Model features (20MB)
│       ├── public-parcels.geojson - Public parcels (6.5MB)
│       ├── transit-bart.geojson
│       └── transit-caltrain.geojson
├── package.json
└── vite.config.js
```

## Current Features

The app currently displays:
- **Parcel map**: All SF parcels rendered with Mapbox GL JS, colored by height (parcels below 45ft appear transparent)
- **Public parcels**: Highlighted with green fill and stripe pattern for non-PUBLIC zoning
- **Transit stations**: BART and Caltrain stations as blue circles
- **Hover tooltip**: Shows address, zoning, supervisor, and height info
- **Sidebar**: Displays FZP vs Your Plan projections table
- **Your Plan Rules**: Users can add upzoning rules to create custom housing plans
  - Rules use natural language format: "Set height X for all parcels in neighborhood Y with zoning code Z and FZP height W"
  - Each criterion (neighborhood, zoning code, FZP height) defaults to "any" - parcels must match ALL specified criteria (AND logic)
  - When multiple rules match a parcel, the tallest height wins
  - Projections recalculate automatically using UnitCalculator

## Key Data Files

**Input data (`data/input/`):**
- `parcels.geojson` (62MB) - Raw parcel geometries from SF Assessor
- `parcels.csv` (18MB) - Parcel attributes including zoning and height
- `fzp-parcels.csv` (11MB) - City Economist's FZP model data (92,722 parcels)
- `land-use.csv` (75MB) - SF Land Use data for building areas
- `height-and-bulk-districts.csv` (5MB) - Height districts for spatial join
- Transit files in `muni/` subdirectory

**Served data (`public/data/`):**
- `parcels.geojson` - Parcel geometries with mapblklot only
- `parcels-overlay.csv` - Parcel attributes for hover tooltip (address, zoning, supervisor, height)
- `parcels-model.csv` - Model features for unit prediction (BlockLot, Height_Ft, Area_1000, zoning/district dummies, etc.)
- `public-parcels.geojson` - Public parcels subset
- Transit files: `transit-bart.geojson`, `transit-caltrain.geojson`, `transit-muni.geojson`

## Parcel Data Structure

Parcel data is split between three files:

**Geometry (`parcels.geojson`):**
```json
{
  "type": "Feature",
  "properties": {
    "mapblklot": "2993020"
  },
  "geometry": { "type": "MultiPolygon", "coordinates": [...] }
}
```

**Overlay (`parcels-overlay.csv`)** - joined by `mapblklot`:
- `mapblklot` - Unique parcel identifier (block + lot)
- `from_address_num`, `street_name`, `street_type` - Address info
- `analysis_neighborhood` - Neighborhood name
- `zoning_code`, `zoning_district` - Zoning info
- `supervisor_district`, `supname` - Supervisor info
- `Height_Ft` - FZP height in feet

**Model (`parcels-model.csv`)** - joined by `BlockLot`:
- `BlockLot` - Unique parcel identifier (same as mapblklot)
- `Height_Ft`, `Area_1000`, `Env_1000_Area_Height`, `Bldg_SqFt_1000` - Envelope metrics
- `Res_Dummy`, `Historic`, `SDB_2016_5Plus` - Property flags
- `zp_*` - Zoning category dummies (8 columns)
- `DIST_*` - District dummies (14 columns)
- `SDB_2016_5Plus_EnvFull`, `Zoning_DR_EnvFull` - Interaction terms
- `fzp_expected_units_low`, `fzp_expected_units_high` - Pre-computed expected units

## Unit Projection Model

The app uses the City Economist's predictive model (see `src/unitCalculator.js`):

- **Probability model**: Logistic regression predicting probability of redevelopment over 20 years
- **Units model**: Linear model predicting units if redeveloped based on envelope, zoning, SDB status
- **Key inputs**: Height_Ft, Area_1000, Env_1000_Area_Height (area * height / 10), zoning type flags, district flags
- **Outputs**: Low growth and high growth expected unit counts
- **Important**: Env_1000_Area_Height must be calculated as `Area_1000 * Height_Ft / 10` to match the source data format

### Dynamic SDB Recalculation

When users apply upzoning rules, the frontend dynamically recalculates SDB (State Density Bonus) qualification based on the new height. SDB applies to buildings that can accommodate 5+ units, so increasing height can push more parcels over the envelope threshold.

The frontend uses the same heuristic as the data pipeline (see SDB Heuristic section below):
- SDB = 1 if: zoning contains RTO/NCT/WMUG AND envelope > 9.0 AND height ≤ 130 ft
- When SDB changes from 0→1, both `SDB_2016_5Plus` and `SDB_2016_5Plus_EnvFull` are updated before calculating expected units

### Caching Strategy

To improve calculation performance, the app uses a two-tier caching system:

1. **Pre-computed FZP baseline**: The `parcels-model.csv` file contains pre-computed expected units at FZP heights (`fzp_expected_units_low` and `fzp_expected_units_high`). These are generated by the data pipeline.

2. **Runtime height cache**: Each parcel object has a `unitsCache` dictionary that stores calculated expected units keyed by `{height}_{scenario}` (e.g., `"85_low"`). When a user creates rules with a specific height, the calculation result is cached for reuse.

When users add upzoning rules:
1. For parcels not affected by rules, pre-computed FZP values are used directly
2. For affected parcels, the cache is checked first; if miss, the calculation runs and result is cached
3. Subsequent rule changes with the same height values use cached results

### Expected Units Validation

The pipeline includes a sanity check to verify total expected units match the city economist's FZP projections:
- Low scenario: 10,098 units
- High scenario: 17,845 units

## Planned Features (Not Yet Implemented)

1. **Three Zoning Layers**:
   - Original Zoning (current SF zoning)
   - Proposed Zoning (June 2025 rezoning proposal)
   - User's Custom Zoning (user-defined via UI)

## Data Pipeline

The data pipeline transforms raw input data into model-ready outputs. Run from the `data/` directory:

```bash
cd data
source ../.venv/bin/activate
jupyter notebook data_pipeline.ipynb
```

### Pipeline Steps

1. **clean_parcels.py**: Load geometries, calculate areas (EPSG:2227)
2. **clean_zoning.py**: Extract zoning, height, neighborhood; spatial join for missing heights
3. **clean_buildings.py**: Extract building sqft from land-use.csv and fzp-parcels.csv
4. **clean_land_use.py**: Determine residential status (RESIDENT, MIXRES, CIE codes)
5. **clean_historic.py**: Extract historic status from FZP data
6. **fill_sdb_historic.py**: Fill SDB status using heuristic for east-side parcels (see SDB Heuristic below)
7. **derive_zoning_dummies.py**: Create one-hot zoning categories (zp_RH2, zp_FBDMulti_RTO, etc.)
8. **derive_district_dummies.py**: Create one-hot district categories (DIST_Mission, etc.)
9. **derive_envelope.py**: Calculate Area_1000, Bldg_SqFt_1000, Env_1000_Area_Height
10. **join_model_inputs.py**: Combine all features into final output
11. **unit_calculator.py**: Python port of unitCalculator.js; pre-computes expected units per parcel

### Model Columns Generated

The pipeline generates 34 model columns including:
- `Height_Ft`, `Area_1000`, `Env_1000_Area_Height`, `Bldg_SqFt_1000`
- `Res_Dummy`, `Historic`, `SDB_2016_5Plus` (from FZP or computed via heuristic)
- 8 zoning dummies: `zp_OfficeComm`, `zp_DRMulti_RTO`, `zp_FBDMulti_RTO`, `zp_PDRInd`, `zp_Public`, `zp_Redev`, `zp_RH2`, `zp_RH3_RM1`
- 14 district dummies: `DIST_SBayshore`, `DIST_BernalHts`, etc.
- `SDB_2016_5Plus_EnvFull` (from FZP), `Zoning_DR_EnvFull` (calculated, 0 for non-density-restricted)
- `fzp_expected_units_low`, `fzp_expected_units_high` (pre-computed expected units at FZP heights)

### Notes

- RH-1 and RH-1(D) parcels (75k) have no zoning category - they are the baseline
- FZP data is used as ground truth for overlapping 92k parcels

### Excluded Parcels

The pipeline excludes certain parcels that cannot be modeled:

1. **Bayview Hunters Point Shipyard** (~751 parcels): Missing both zoning and height data. Located in former naval shipyard under separate redevelopment jurisdiction, not covered by standard SF zoning/height districts.

2. **Presidio parcels**: Under National Park Service jurisdiction, not subject to SF zoning.

3. **Non-housing zones**: Industrial (M-1, M-2), PDR, Treasure Island special zones, P (public) zones.

4. **Open space parcels**: Height >= 1000 ft (placeholder value for parks/open space).

### SDB Heuristic

For east-side parcels not in the FZP dataset, we compute SDB (State Density Bonus) qualification using a heuristic derived from FZP data analysis. SDB applies to parcels that can accommodate 5+ units.

**SDB = 1 if ALL of:**
1. Zoning code contains "RTO", "NCT", or "WMUG"
2. Envelope (`Env_1000_Area_Height`) > 9.0
3. Height ≤ 130 ft

Validation against FZP data (92,722 parcels):
- Precision: 99.6%, Recall: 99.6%, Accuracy: 99.93%
- 31 false positives, 34 false negatives

Implementation: `data/transforms/fill_sdb_historic.py` - `compute_sdb_qualification()`

## Development Workflow

1. **Update source data**: Place new files in `data/input/`
2. **Run pipeline**: Execute `data/data_pipeline.ipynb` to regenerate outputs
3. **Test in dev mode**: Run `npm run dev`
4. **Build for production**: Run `npm run build`
5. **Deploy**: Upload `dist/` directory to static hosting

## Geospatial Notes

- All GeoJSON files use CRS EPSG:4326 (WGS84) for Mapbox compatibility
- Spatial joins use parcel centroids to handle non-convex polygons
- Parcels are uniquely identified by `mapblklot` (block/lot combination)
- Mapbox GL JS handles geometry rendering and user interactions
- Map is bounded to San Francisco area with zoom limits (10-18)

## Performance Optimizations

### Geometry Simplification
The `public/data/parcels.geojson` file is simplified using mapshaper (50% simplification with keep-shapes) to reduce file size from 59MB to 47MB while preserving parcel boundaries.

To re-simplify from source data:
```bash
mapshaper data/parcels.geojson -simplify 50% keep-shapes -o public/data/parcels.geojson force
```

### Gzip Compression
Production builds use `vite-plugin-compression` to generate `.gz` versions of all data files. This reduces transfer sizes significantly:
- `parcels.geojson`: 47MB → 10MB (gzipped)
- `parcels.csv`: 16MB → 3.1MB (gzipped)
- `fzp-zoning.csv`: 13MB → 875KB (gzipped)

Static hosting services (Netlify, Vercel, etc.) automatically serve `.gz` files when the client supports gzip.
