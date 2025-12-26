# SF Rezoning Web App

Vue.js web application for visualizing and analyzing San Francisco rezoning scenarios.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Mapbox Token

1. Get a free Mapbox token at https://account.mapbox.com/
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Add your token to `.env`:
   ```
   VITE_MAPBOX_TOKEN=pk.your_actual_token_here
   ```

### 3. Run Development Server

```bash
npm run dev
```

The app will open at http://localhost:5173

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory, ready to deploy to any static hosting service (Netlify, Vercel, etc.).

## Project Status

### Phase 0: Display Map ✅
- [x] Vue 3 + Vite setup
- [x] Mapbox GL JS integration
- [x] SF map display

### Phase 1: Add Parcels (In Progress)
- [ ] Generate parcel GeoJSON from sf_map.RDS
- [ ] Overlay parcels on map

### Phase 2: Interactive Features (Planned)
- [ ] Parcel attribute data
- [ ] UI for attribute selection
- [ ] Floor calculation logic
