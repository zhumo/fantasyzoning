# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

See @README.md

## Running the Application

### Local Development

From the `web` directory:

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
2. **Served data**: `web/public/data/` contains files served to the frontend
3. **Frontend**: Vue.js loads geometry and attributes from `/data/`, joins them client-side by mapblklot, and renders in Mapbox

### App Structure (`web/`)

```
web/
├── src/
│   ├── App.vue              - Root component (title: "Rezoner")
│   ├── components/
│   │   └── MapView.vue      - Map rendering and parcel interaction
│   ├── main.js              - App entry point
│   └── style.css            - Global styles
├── public/
│   └── data/
│       ├── parcels.geojson      - Parcel geometries (59MB)
│       ├── parcels.csv          - Parcel attributes (16MB)
│       ├── public-parcels.geojson - Public parcels (5.8MB)
│       ├── transit-bart.geojson
│       └── transit-caltrain.geojson
├── package.json
└── vite.config.js
```

## Current Features

The app currently displays:
- **Parcel map**: All SF parcels rendered with Mapbox GL JS, colored by height
- **Public parcels**: Highlighted with green fill and stripe pattern for non-PUBLIC zoning
- **Transit stations**: BART and Caltrain stations as blue circles
- **Hover tooltip**: Shows address, zoning, supervisor (with district number as integer), and height info
- **Sidebar**: Displays FZP vs Your Plan projections table
- **Your Plan Rules**: Users can add upzoning rules to create custom housing plans
  - Rules use natural language format: "Set height X for all parcels in neighborhood Y with zoning code Z and FZP height W"
  - Each criterion (neighborhood, zoning code, FZP height) defaults to "any" - parcels must match ALL specified criteria (AND logic)
  - When multiple rules match a parcel, the tallest height wins
  - Projections recalculate automatically using UnitCalculator

## Key Data Files

**Source data (`data/` directory):**
- `parcels.geojson` (59MB) - Raw parcel geometries
- `parcels.csv` (16MB) - Raw parcel attributes with `current_height_ft` and `fzp_height_ft` columns
- `zoning-heights.csv` - Height district polygons with `height` (district code) and `gen_hght` (base height in feet)
- `fzp-zoning.csv` - Parcel data for projection model (contains model coefficients)
- `public-parcels.geojson` (5.6MB) - Public parcels subset
- Transit files: `transit-bart.geojson`, `transit-caltrain.geojson`

**Served data (`web/public/data/`):**
- Same structure as source data, served at `/data/` path

## Parcel Data Structure

Parcel data is split between two files, joined by `mapblklot`:

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

**Attributes (`parcels.csv`):**
Display fields:
- `mapblklot` - Unique parcel identifier (block + lot)
- `analysis_neighborhood` - Neighborhood name
- `from_address_num` - Street address number
- `street_name`, `street_type` - Street information
- `supervisor_district` - District number
- `supname` - Supervisor name
- `zoning_code` - Current zoning code (e.g., "RH-2")
- `zoning_district` - Full zoning name
- `blklots` - Associated block/lots
- `current_height_ft` - Current allowed height in feet
- `fzp_height_ft` - Family Zoning Plan allowed height in feet

**Height data sources:**
- For FZP-affected parcels: heights come from FZP proposal data
- For non-FZP parcels: heights filled via geospatial join with `zoning-heights.csv` (current = FZP since unchanged)
- ~831 parcels remain without height data (edge cases: waterfront, piers, missing zoning)

Model fields (for unit projection, null for ~60k parcels excluded from model):
- `Height_Ft`, `Area_1000`, `Env_1000_Area_Height` - Envelope dimensions
- `SDB_2016_5Plus`, `SDB_2016_5Plus_EnvFull`, `Zoning_DR_EnvFull` - Model coefficients
- `zp_*` - Zoning type flags (OfficeComm, DRMulti_RTO, etc.)
- `DIST_*` - District flags (SBayshore, BernalHts, etc.)
- `fzp_expected_units_low`, `fzp_expected_units_high` - Pre-computed expected units at FZP heights

## Unit Projection Model

The app uses the City Economist's predictive model (see `web/src/unitCalculator.js`):

- **Probability model**: Logistic regression predicting probability of redevelopment over 20 years
- **Units model**: Linear model predicting units if redeveloped based on envelope, zoning, SDB status
- **Key inputs**: Height_Ft, Area_1000, Env_1000_Area_Height (area * height / 10), zoning type flags, district flags
- **Outputs**: Low growth and high growth expected unit counts
- **Important**: Env_1000_Area_Height must be calculated as `Area_1000 * Height_Ft / 10` to match the source data format

### Caching Strategy

To improve calculation performance, the app uses a two-tier caching system:

1. **Pre-computed FZP baseline**: The `parcels.csv` file contains pre-computed expected units at FZP heights (`fzp_expected_units_low` and `fzp_expected_units_high`). These are generated by `scripts/precompute_units.py`.

2. **Runtime height cache**: Each parcel object has a `unitsCache` dictionary that stores calculated expected units keyed by `{height}_{scenario}` (e.g., `"85_low"`). When a user creates rules with a specific height, the calculation result is cached for reuse.

When users add upzoning rules:
1. For parcels not affected by rules, pre-computed FZP values are used directly
2. For affected parcels, the cache is checked first; if miss, the calculation runs and result is cached
3. Subsequent rule changes with the same height values use cached results

## Planned Features (Not Yet Implemented)

1. **Three Zoning Layers**:
   - Original Zoning (current SF zoning)
   - Proposed Zoning (June 2025 rezoning proposal)
   - User's Custom Zoning (user-defined via UI)

## Development Workflow

1. **Update source data**: Place new files in `data/` directory
2. **Copy to public**: Copy updated files to `web/public/data/`
3. **Test in dev mode**: Run `npm run dev` in `web/`
4. **Build for production**: Run `npm run build` in `web/`
5. **Deploy**: Upload `dist/` directory to static hosting

## Geospatial Notes

- All GeoJSON files use CRS EPSG:4326 (WGS84) for Mapbox compatibility
- Spatial joins use parcel centroids to handle non-convex polygons
- Parcels are uniquely identified by `mapblklot` (block/lot combination)
- Mapbox GL JS handles geometry rendering and user interactions
- Map is bounded to San Francisco area with zoom limits (10-18)

## Performance Optimizations

### Geometry Simplification
The `web/public/data/parcels.geojson` file is simplified using mapshaper (50% simplification with keep-shapes) to reduce file size from 59MB to 47MB while preserving parcel boundaries.

To re-simplify from source data:
```bash
mapshaper data/parcels.geojson -simplify 50% keep-shapes -o web/public/data/parcels.geojson force
```

### Gzip Compression
Production builds use `vite-plugin-compression` to generate `.gz` versions of all data files. This reduces transfer sizes significantly:
- `parcels.geojson`: 47MB → 10MB (gzipped)
- `parcels.csv`: ~4MB (gzipped)

Static hosting services (Netlify, Vercel, etc.) automatically serve `.gz` files when the client supports gzip.
