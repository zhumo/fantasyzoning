#!/usr/bin/env python3
"""Step 05: Fill missing area from geometry calculation"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

import geopandas as gpd
from shapely import wkt

from lib.io import read_csv, write_csv, write_exception, copy_to_next_step


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    initial_count = len(df)

    missing_area_mask = df['Shape_Area_SqFt'].isna()
    initial_missing = missing_area_mask.sum()

    if initial_missing > 0:
        missing_gdf = gpd.GeoDataFrame(
            df[missing_area_mask],
            geometry=df.loc[missing_area_mask, 'shape'].apply(wkt.loads),
            crs='EPSG:4326'
        ).to_crs('EPSG:2227')

        area_lookup = missing_gdf.geometry.area.to_dict()
        df.loc[missing_area_mask, 'Shape_Area_SqFt'] = df.loc[missing_area_mask].index.map(area_lookup).astype(str)

    df['Shape_Area_SqFt_numeric'] = df['Shape_Area_SqFt'].str.replace(',', '').astype(float)

    missing_area_1000_mask = df['Area_1000'].isna()
    df.loc[missing_area_1000_mask, 'Area_1000'] = (df.loc[missing_area_1000_mask, 'Shape_Area_SqFt_numeric'] / 1000).astype(str)

    df = df.drop(columns=['Shape_Area_SqFt_numeric'])

    still_missing = df['Area_1000'].isna().sum()
    filled = initial_missing - still_missing

    if still_missing > 0:
        write_exception(
            df[df['Area_1000'].isna()][['mapblklot', 'analysis_neighborhood']],
            '05-fill-area-still-missing.csv'
        )

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'filled': filled, 'missing': still_missing}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (filled {r['filled']:,}, still missing {r['missing']:,})")
