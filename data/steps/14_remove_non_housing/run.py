#!/usr/bin/env python3
"""Step 14: Remove non-housing parcels"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

import pandas as pd
import geopandas as gpd
from shapely import wkt

from lib.io import read_csv, read_geojson, write_csv, write_geojson, copy_to_next_step
from lib.paths import INPUT_FILES

NON_HOUSING_EXACT_ZONES = ['M-1', 'M-2', 'P']
NON_HOUSING_PREFIX_PATTERNS = ['PDR-1-B', 'PDR-1-D', 'PDR-1-G', 'PDR-2', 'TI-OS', 'TI-R', 'TI-MU']
LARGE_PARCEL_AREA_THRESHOLD = 100


def _zone_matches_pattern(zone):
    if pd.isna(zone):
        return False
    zone_primary = zone.split(';')[0].strip()
    if zone_primary in NON_HOUSING_EXACT_ZONES:
        return True
    for pattern in NON_HOUSING_PREFIX_PATTERNS:
        if zone_primary.startswith(pattern):
            return True
    return False


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    public_parcels_gdf = read_geojson(INPUT_FILES['public_parcels'])
    initial_count = len(df)

    is_non_housing_zone = df['zoning_code'].apply(_zone_matches_pattern)

    area_numeric = pd.to_numeric(df['Area_1000'], errors='coerce').fillna(0)
    is_large_rh1d = (df['zoning_code'] == 'RH-1(D)') & (area_numeric > LARGE_PARCEL_AREA_THRESHOLD)

    non_housing_mask = is_non_housing_zone | is_large_rh1d
    removed = non_housing_mask.sum()

    if removed > 0:
        non_housing_parcels = df[non_housing_mask].copy()
        non_housing_parcels['geometry'] = non_housing_parcels['shape'].apply(wkt.loads)
        non_housing_gdf = gpd.GeoDataFrame(non_housing_parcels, geometry='geometry', crs='EPSG:4326')

        existing_mapblklots = set(public_parcels_gdf['mapblklot'])
        new_public = non_housing_gdf[~non_housing_gdf['mapblklot'].isin(existing_mapblklots)]

        if len(new_public) > 0:
            cols_to_keep = [c for c in public_parcels_gdf.columns if c in new_public.columns]
            new_public_subset = new_public[cols_to_keep]

            combined = pd.concat([public_parcels_gdf, new_public_subset], ignore_index=True)
            write_geojson(combined, INPUT_FILES['public_parcels'])

    result = df[~non_housing_mask]

    write_csv(result, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(result), 'removed': removed}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (removed {r['removed']:,})")
