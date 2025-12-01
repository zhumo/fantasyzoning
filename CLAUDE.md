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
- **Parcel map**: All SF parcels rendered with Mapbox GL JS
- **Public parcels**: Highlighted with green fill and stripe pattern for non-PUBLIC zoning
- **Transit stations**: BART and Caltrain stations as blue circles
- **Parcel selection**: Click to select, shows details in sidebar
- **Hover tooltip**: Shows address on hover
- **Sidebar**: Displays selected parcel info (address, neighborhood, zoning, supervisor)

## Key Data Files

**Source data (`data/` directory):**
- `parcels.geojson` (59MB) - Raw parcel geometries
- `parcels.csv` (16MB) - Raw parcel attributes
- `fzp.csv` (16MB) - Floor-zone-parcel analysis data
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
- `mapblklot` - Unique parcel identifier (block + lot)
- `analysis_neighborhood` - Neighborhood name
- `from_address_num` - Street address number
- `street_name`, `street_type` - Street information
- `supervisor_district` - District number
- `supname` - Supervisor name
- `zoning_code` - Current zoning code (e.g., "RH-2")
- `zoning_district` - Full zoning name
- `blklots` - Associated block/lots

## Planned Features (Not Yet Implemented)

The following features are planned but not yet built:

1. **Three Zoning Layers**:
   - Original Zoning (current SF zoning)
   - Proposed Zoning (June 2025 rezoning proposal)
   - User's Custom Zoning (user-defined via UI)

2. **Height limit fields** (not in current CSV):
   - `current_height_num`, `current_height_code`
   - `proposed_height`, `proposed_height_num`

3. **Unit calculation** using constants:
   - `building_efficiency_discount = 0.8`
   - `typical_unit_size = 850` sq ft

4. **Upzoning criteria UI** on the left sidebar

5. **Expected units display** showing projected housing units

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
