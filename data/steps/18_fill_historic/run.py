#!/usr/bin/env python3
"""Step 18: Fill historic status from historic districts"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

import geopandas as gpd

from lib.io import read_csv, write_csv, write_exception, copy_to_next_step, csv_to_gdf
from lib.paths import INPUT_FILES


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    historic_districts_df = read_csv(INPUT_FILES['historic_districts'])
    historic_districts_gdf = csv_to_gdf(historic_districts_df)
    initial_count = len(df)

    missing_historic_mask = (df['historic'].isna() | (df['historic'] == '')) & \
                            (df['Historic'].isna() | (df['Historic'] == ''))
    initial_missing = missing_historic_mask.sum()

    parcels_gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.GeoSeries.from_wkt(df['shape']),
        crs='EPSG:4326'
    )
    parcels_gdf_projected = parcels_gdf.to_crs('EPSG:2227')
    parcels_gdf['centroid'] = parcels_gdf_projected.geometry.centroid.to_crs('EPSG:4326')
    parcels_centroids_gdf = parcels_gdf.set_geometry('centroid')

    joined = gpd.sjoin(parcels_centroids_gdf, historic_districts_gdf, how='left', predicate='within')
    parcels_in_historic_district = joined[joined['name'].notna()]['mapblklot'].unique()

    df['in_historic_district'] = df['mapblklot'].isin(parcels_in_historic_district).astype(int).astype(str)

    df.loc[missing_historic_mask, 'historic'] = df.loc[missing_historic_mask, 'in_historic_district']
    df.loc[missing_historic_mask, 'Historic'] = df.loc[missing_historic_mask, 'in_historic_district']

    computed_count = missing_historic_mask.sum()

    if computed_count > 0:
        write_exception(
            df[missing_historic_mask][['mapblklot', 'analysis_neighborhood', 'Historic', 'in_historic_district']],
            '18-fill-historic-computed.csv'
        )

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'computed': computed_count}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (computed {r['computed']:,})")
