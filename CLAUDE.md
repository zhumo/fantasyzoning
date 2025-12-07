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
- **Hover tooltip**: Shows address, zoning, supervisor, and height info
- **Sidebar**: Displays FZP vs Your Plan projections table
- **Your Plan Rules**: Users can add upzoning rules to create custom housing plans
  - Select parcels by: Parcel ID, Neighborhood, Zoning Code, or FZP Height
  - Set proposed height for matching parcels
  - When rules overlap, tallest height wins
  - Projections recalculate automatically using UnitCalculator

## Key Data Files

**Source data (`data/` directory):**
- `parcels.geojson` (59MB) - Raw parcel geometries
- `parcels.csv` (16MB) - Raw parcel attributes
- `fzp-zoning.csv` - Parcel data for projection model (contains model coefficients)
- `public-parcels.geojson` (5.6MB) - Public parcels subset
- Transit files: `transit-bart.geojson`, `transit-caltrain.geojson`

**Served data (`web/public/data/`):**
- Same structure as source data, served at `/data/` path
- `fzp-zoning.csv` - Copy of source fzp-zoning.csv for client-side projections

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
- `mapblklot` - Unique parcel identifier (block + lot)
- `analysis_neighborhood` - Neighborhood name
- `from_address_num` - Street address number
- `street_name`, `street_type` - Street information
- `supervisor_district` - District number
- `supname` - Supervisor name
- `zoning_code` - Current zoning code (e.g., "RH-2")
- `zoning_district` - Full zoning name
- `blklots` - Associated block/lots

## Unit Projection Model

The app uses the City Economist's predictive model (see `web/src/unitCalculator.js`):

- **Probability model**: Logistic regression predicting probability of redevelopment over 20 years
- **Units model**: Linear model predicting units if redeveloped based on envelope, zoning, SDB status
- **Key inputs**: Height_Ft, Area_1000, Env_1000_Area_Height (area * height), zoning type flags, district flags
- **Outputs**: Low growth and high growth expected unit counts

When users add upzoning rules:
1. Matching parcels get their Height_Ft updated to proposed height
2. Env_1000_Area_Height is recalculated (Area_1000 * new height)
3. Projections are recalculated for all parcels

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
