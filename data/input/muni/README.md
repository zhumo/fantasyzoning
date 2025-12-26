# Muni GTFS Data

This directory contains GTFS (General Transit Feed Specification) data for San Francisco Muni transit.

## Files

- `agency.txt` - Transit agency information
- `routes.txt` - Route definitions (bus, light rail, cable car)
- `trips.txt` - Individual trips for each route
- `stops.txt` - Stop locations with coordinates
- `stop_times.txt` - Arrival/departure times at each stop
- `shapes.txt` - Geographic path of routes
- `calendar.txt` / `calendar_dates.txt` - Service schedules

## Extract Stops Script

The `extract_stops.py` script extracts all unique stops served by Muni Metro light rail lines and the Van Ness corridor, outputting a GeoJSON file.

### Routes Included

**Light Rail / Streetcar:**
- F - Market & Wharves (historic streetcar)
- J - Church
- K - Ingleside
- L - Taraval
- M - Ocean View
- N - Judah
- T - Third Street

**Bus (Van Ness corridor only):**
- 49 - Van Ness-Mission (only stops with "Van Ness" in the name)

### Usage

```bash
# From this directory
python3 extract_stops.py

# Or from project root
python3 data/muni_gtfs-current/extract_stops.py
```

### Output

The script generates `data/transit-muni.geojson` with the following structure:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "stop_id": "7876",
        "stop_name": "Chinatown - Rose Pak Station",
        "stop_lat": 37.794807,
        "stop_lon": -122.408078,
        "routes": "T"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-122.408078, 37.794807]
      }
    }
  ]
}
```

The `routes` property indicates which line(s) serve each stop (e.g., `"J"`, `"K,L,M"`, `"49-VanNess"`).

### After Running

Copy the output to the web app's public data directory:

```bash
cp ../transit-muni.geojson ../../web/public/data/
```

