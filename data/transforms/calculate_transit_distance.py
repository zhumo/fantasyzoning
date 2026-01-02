import pandas as pd
import geopandas as gpd
import numpy as np
from shapely.geometry import Point


def haversine_distance_ft(lat1, lon1, lat2, lon2):
    R = 3958.8
    dLat = np.radians(lat2 - lat1)
    dLon = np.radians(lon2 - lon1)
    a = np.sin(dLat / 2) ** 2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dLon / 2) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c * 5280


def load_transit_stops(bart_path, muni_path, caltrain_path):
    bart = gpd.read_file(bart_path)
    muni = gpd.read_file(muni_path)
    caltrain = gpd.read_file(caltrain_path)

    stops = []
    for gdf in [bart, muni, caltrain]:
        for _, row in gdf.iterrows():
            coords = row.geometry.coords[0]
            stops.append({'lon': coords[0], 'lat': coords[1]})

    return pd.DataFrame(stops)


def get_centroid(geometry):
    if geometry is None:
        return None, None
    centroid = geometry.centroid
    return centroid.y, centroid.x


def calculate_transit_distances(parcels_gdf, transit_stops_df):
    distances = []
    stop_coords = transit_stops_df[['lat', 'lon']].values

    for idx, row in parcels_gdf.iterrows():
        lat, lon = get_centroid(row.geometry)
        if lat is None:
            distances.append(np.inf)
            continue

        min_dist = np.inf
        for stop_lat, stop_lon in stop_coords:
            dist = haversine_distance_ft(lat, lon, stop_lat, stop_lon)
            if dist < min_dist:
                min_dist = dist

        distances.append(min_dist)

    return distances


def fill_transit_distance(parcels_gdf, bart_path, muni_path, caltrain_path):
    transit_stops = load_transit_stops(bart_path, muni_path, caltrain_path)
    distances = calculate_transit_distances(parcels_gdf, transit_stops)
    parcels_gdf = parcels_gdf.copy()
    parcels_gdf['distance_to_transit'] = distances
    parcels_gdf.loc[parcels_gdf['distance_to_transit'] == np.inf, 'distance_to_transit'] = pd.NA
    return parcels_gdf
