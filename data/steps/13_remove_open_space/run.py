#!/usr/bin/env python3
"""Step 13: Remove open space parcels (height >= 1000)"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

import pandas as pd
import geopandas as gpd
from shapely import wkt

from lib.io import read_csv, read_geojson, write_csv, write_geojson, copy_to_next_step
from lib.paths import INPUT_FILES


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    public_parcels_gdf = read_geojson(INPUT_FILES['public_parcels'])
    initial_count = len(df)

    height_numeric = df['Height_Ft'].str.replace(',', '').astype(float)
    open_space_mask = height_numeric >= 1000

    removed = open_space_mask.sum()

    if removed > 0:
        open_space_parcels = df[open_space_mask].copy()
        open_space_parcels['geometry'] = open_space_parcels['shape'].apply(wkt.loads)
        open_space_gdf = gpd.GeoDataFrame(open_space_parcels, geometry='geometry', crs='EPSG:4326')

        existing_mapblklots = set(public_parcels_gdf['mapblklot'])
        new_public = open_space_gdf[~open_space_gdf['mapblklot'].isin(existing_mapblklots)]

        if len(new_public) > 0:
            cols_to_keep = [c for c in public_parcels_gdf.columns if c in new_public.columns]
            new_public_subset = new_public[cols_to_keep]

            combined = pd.concat([public_parcels_gdf, new_public_subset], ignore_index=True)
            write_geojson(combined, INPUT_FILES['public_parcels'])

    result = df[~open_space_mask]

    write_csv(result, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(result), 'removed': removed}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (removed {r['removed']:,})")
