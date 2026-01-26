#!/usr/bin/env python3
"""Step 12: Fill height from spatial join"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

import geopandas as gpd
from shapely import wkt

from lib.io import read_csv, write_csv, write_exception, copy_to_next_step, csv_to_gdf
from lib.paths import INPUT_FILES


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    height_bulk_df = read_csv(INPUT_FILES['height_bulk'])
    height_bulk_gdf = csv_to_gdf(height_bulk_df)
    initial_count = len(df)

    missing_height_mask = df['Height_Ft'].isna()
    initial_missing = missing_height_mask.sum()

    if initial_missing > 0:
        missing_parcels = df[missing_height_mask].copy()
        missing_parcels['geometry'] = missing_parcels['shape'].apply(wkt.loads)
        missing_gdf = gpd.GeoDataFrame(missing_parcels, geometry='geometry', crs='EPSG:4326')

        missing_gdf_projected = missing_gdf.to_crs('EPSG:2227')
        missing_gdf['centroid'] = missing_gdf_projected.geometry.centroid.to_crs('EPSG:4326')

        centroid_gdf = missing_gdf.set_geometry('centroid')
        joined = gpd.sjoin(centroid_gdf, height_bulk_gdf[['geometry', 'gen_hght']], how='left', predicate='within')

        height_lookup = joined.set_index(joined.index)['gen_hght'].to_dict()
        df.loc[missing_height_mask, 'Height_Ft'] = df.loc[missing_height_mask].index.map(height_lookup)

    filled_via_spatial = df.loc[missing_height_mask, 'Height_Ft'].notna().sum()
    still_missing = initial_missing - filled_via_spatial

    if filled_via_spatial > 0:
        imputed_mask = missing_height_mask & df['Height_Ft'].notna()
        write_exception(
            df[imputed_mask][['mapblklot', 'analysis_neighborhood', 'Height_Ft']],
            '12-fill-height-imputed.csv'
        )

    if still_missing > 0:
        still_missing_mask = df['Height_Ft'].isna()
        write_exception(
            df[still_missing_mask][['mapblklot', 'analysis_neighborhood']],
            '12-fill-height-still-missing.csv'
        )

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'imputed': filled_via_spatial, 'missing': still_missing}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (imputed {r['imputed']:,}, still missing {r['missing']:,})")
