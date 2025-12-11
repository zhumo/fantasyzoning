#!/usr/bin/env python3
"""
Extract Muni light rail and Van Ness corridor stops from GTFS data.

Outputs a GeoJSON file with all unique stops served by:
- Muni Metro light rail lines: J, K, L, M, N, T
- F-Market streetcar
- Route 49 stops on Van Ness Avenue
"""

import csv
import json
import os
from collections import defaultdict

# Configuration
LIGHT_RAIL_ROUTES = ['F', 'J', 'K', 'L', 'M', 'N', 'T']
VAN_NESS_ROUTE = '49'
VAN_NESS_FILTER = 'Van Ness'

# File paths (relative to script location)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GTFS_DIR = os.path.join(SCRIPT_DIR, 'muni_gtfs-current')
TRIPS_FILE = os.path.join(GTFS_DIR, 'trips.txt')
STOP_TIMES_FILE = os.path.join(GTFS_DIR, 'stop_times.txt')
STOPS_FILE = os.path.join(GTFS_DIR, 'stops.txt')
OUTPUT_FILE = os.path.join(SCRIPT_DIR, '..', 'transit-muni.geojson')


def load_trips_for_routes(routes):
    """Load trip_ids for specified routes, returning dict of trip_id -> route_id."""
    trip_to_route = {}
    with open(TRIPS_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['route_id'] in routes:
                trip_to_route[row['trip_id']] = row['route_id']
    return trip_to_route


def load_stops_for_trips(trip_to_route):
    """Load unique stop_ids for given trips, tracking which routes serve each stop."""
    stop_to_routes = defaultdict(set)
    with open(STOP_TIMES_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            trip_id = row['trip_id']
            if trip_id in trip_to_route:
                stop_id = row['stop_id']
                route_id = trip_to_route[trip_id]
                stop_to_routes[stop_id].add(route_id)
    return stop_to_routes


def load_stop_details(stop_ids):
    """Load stop details (name, lat, lon) for given stop_ids."""
    stops = {}
    with open(STOPS_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['stop_id'] in stop_ids:
                stops[row['stop_id']] = {
                    'stop_id': row['stop_id'],
                    'stop_name': row['stop_name'].strip(),
                    'stop_lat': float(row['stop_lat']),
                    'stop_lon': float(row['stop_lon'])
                }
    return stops


def filter_van_ness_stops(stop_details, stop_to_routes):
    """Filter stops to only include those on Van Ness Avenue for route 49."""
    filtered_routes = {}
    for stop_id, routes in stop_to_routes.items():
        if VAN_NESS_ROUTE in routes:
            # Check if stop name contains "Van Ness"
            if stop_id in stop_details:
                stop_name = stop_details[stop_id]['stop_name']
                if VAN_NESS_FILTER in stop_name:
                    # Keep this stop, mark it as Van Ness route
                    new_routes = set(routes)
                    new_routes.discard(VAN_NESS_ROUTE)
                    new_routes.add('49-VanNess')
                    filtered_routes[stop_id] = new_routes
                else:
                    # Remove route 49 from this stop (not on Van Ness)
                    new_routes = set(routes)
                    new_routes.discard(VAN_NESS_ROUTE)
                    if new_routes:
                        filtered_routes[stop_id] = new_routes
        else:
            filtered_routes[stop_id] = routes
    return filtered_routes


def create_geojson(stop_details, stop_to_routes):
    """Create GeoJSON FeatureCollection from stop data."""
    features = []
    for stop_id, details in sorted(stop_details.items()):
        if stop_id not in stop_to_routes:
            continue
        routes = sorted(stop_to_routes[stop_id])
        feature = {
            "type": "Feature",
            "properties": {
                "stop_id": details['stop_id'],
                "stop_name": details['stop_name'],
                "stop_lat": details['stop_lat'],
                "stop_lon": details['stop_lon'],
                "routes": ','.join(routes)
            },
            "geometry": {
                "type": "Point",
                "coordinates": [details['stop_lon'], details['stop_lat']]
            }
        }
        features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


def main():
    print("Extracting Muni light rail and Van Ness corridor stops...")
    
    # Step 1: Get all trips for target routes (light rail + route 49)
    all_routes = LIGHT_RAIL_ROUTES + [VAN_NESS_ROUTE]
    print(f"  Loading trips for routes: {', '.join(all_routes)}")
    trip_to_route = load_trips_for_routes(all_routes)
    print(f"  Found {len(trip_to_route)} trips")
    
    # Step 2: Get all stops served by these trips
    print("  Loading stop_times...")
    stop_to_routes = load_stops_for_trips(trip_to_route)
    print(f"  Found {len(stop_to_routes)} unique stops")
    
    # Step 3: Load stop details
    print("  Loading stop details...")
    stop_details = load_stop_details(set(stop_to_routes.keys()))
    print(f"  Loaded details for {len(stop_details)} stops")
    
    # Step 4: Filter Van Ness stops
    print("  Filtering Van Ness corridor stops...")
    stop_to_routes = filter_van_ness_stops(stop_details, stop_to_routes)
    
    # Remove stops that no longer have any routes
    stop_to_routes = {k: v for k, v in stop_to_routes.items() if v}
    print(f"  Final stop count: {len(stop_to_routes)}")
    
    # Step 5: Generate GeoJSON
    print("  Generating GeoJSON...")
    geojson = create_geojson(stop_details, stop_to_routes)
    
    # Step 6: Write output
    output_path = os.path.normpath(OUTPUT_FILE)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2)
    print(f"  Written to: {output_path}")
    
    # Summary
    route_counts = defaultdict(int)
    for routes in stop_to_routes.values():
        for route in routes:
            route_counts[route] += 1
    
    print("\nStops per route:")
    for route in sorted(route_counts.keys()):
        print(f"  {route}: {route_counts[route]} stops")
    
    print(f"\nTotal unique stops: {len(geojson['features'])}")
    print("Done!")


if __name__ == '__main__':
    main()

