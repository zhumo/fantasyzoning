#!/usr/bin/env python3
"""Step 20: Fill transit distance from transit stops"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

import pandas as pd
import geopandas as gpd
import numpy as np
from shapely import wkt

from lib.io import read_csv, read_geojson, write_csv, copy_to_next_step
from lib.paths import INPUT_FILES


def _haversine_distance_ft(lat1, lon1, lat2, lon2):
    R = 3958.8
    dLat = np.radians(lat2 - lat1)
    dLon = np.radians(lon2 - lon1)
    a = np.sin(dLat / 2) ** 2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dLon / 2) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c * 5280


def _load_transit_stops():
    bart = read_geojson(INPUT_FILES['transit_bart'])
    muni = read_geojson(INPUT_FILES['transit_muni'])
    caltrain = read_geojson(INPUT_FILES['transit_caltrain'])

    stops = []
    for gdf in [bart, muni, caltrain]:
        for _, row in gdf.iterrows():
            coords = row.geometry.coords[0]
            stops.append({'lon': coords[0], 'lat': coords[1]})

    return pd.DataFrame(stops)


def _get_centroid(geometry):
    if geometry is None:
        return None, None
    centroid = geometry.centroid
    return centroid.y, centroid.x


def _calculate_transit_distances(parcels_gdf, transit_stops_df):
    distances = []
    stop_coords = transit_stops_df[['lat', 'lon']].values

    for idx, row in parcels_gdf.iterrows():
        lat, lon = _get_centroid(row.geometry)
        if lat is None:
            distances.append(np.inf)
            continue

        min_dist = np.inf
        for stop_lat, stop_lon in stop_coords:
            dist = _haversine_distance_ft(lat, lon, stop_lat, stop_lon)
            if dist < min_dist:
                min_dist = dist

        distances.append(min_dist)

    return distances


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    initial_count = len(df)

    parcels_gdf = gpd.GeoDataFrame(
        df[['mapblklot']],
        geometry=df['shape'].apply(wkt.loads),
        crs='EPSG:4326'
    )

    transit_stops = _load_transit_stops()
    distances = _calculate_transit_distances(parcels_gdf, transit_stops)

    df['distance_to_transit'] = distances
    df.loc[df['distance_to_transit'] == np.inf, 'distance_to_transit'] = pd.NA

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df)}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,}")
