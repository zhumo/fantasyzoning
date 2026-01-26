#!/usr/bin/env python3
"""Step 21: Write final outputs"""
import sys
import shutil
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

import geopandas as gpd
from shapely import wkt

from lib.io import read_csv, read_geojson, write_csv, write_geojson
from lib.paths import INPUT_FILES, OUTPUT_DIR, PUBLIC_DIR

OVERLAY_COLS = [
    'mapblklot',
    'from_address_num',
    'street_name',
    'street_type',
    'analysis_neighborhood',
    'zoning_code',
    'zoning_district',
    'supervisor_district',
    'supname',
    'Height_Ft',
    'distance_to_transit',
]

MODEL_COLS = [
    'mapblklot',
    'Height_Ft',
    'Area_1000',
    'Env_1000_Area_Height',
    'Bldg_SqFt_1000',
    'Res_Dummy',
    'Historic',
    'SDB_2016_5Plus',
    'zp_OfficeComm',
    'zp_DRMulti_RTO',
    'zp_FBDMulti_RTO',
    'zp_PDRInd',
    'zp_Public',
    'zp_Redev',
    'zp_RH2',
    'zp_RH3_RM1',
    'DIST_SBayshore',
    'DIST_BernalHts',
    'DIST_Scentral',
    'DIST_Central',
    'DIST_BuenaVista',
    'DIST_Northeast',
    'DIST_WestAddition',
    'DIST_SOMA',
    'DIST_InnerSunset',
    'DIST_Richmond',
    'DIST_Ingleside',
    'DIST_OuterSunset',
    'DIST_Marina',
    'DIST_Mission',
    'SDB_2016_5Plus_EnvFull',
    'Zoning_DR_EnvFull',
    'fzp_expected_units_low',
    'fzp_expected_units_high',
]


def _enrich_public_parcels(raw_parcels_df):
    public_gdf = read_geojson(INPUT_FILES['public_parcels'])
    public_mapblklots = set(public_gdf['mapblklot'].astype(str))

    overlay_data = raw_parcels_df[raw_parcels_df['mapblklot'].astype(str).isin(public_mapblklots)].copy()
    overlay_data = overlay_data.drop_duplicates(subset='mapblklot', keep='first')

    overlay_cols_available = [c for c in OVERLAY_COLS if c in overlay_data.columns]
    overlay_lookup = overlay_data.set_index('mapblklot')[overlay_cols_available[1:]].to_dict('index')

    for idx, row in public_gdf.iterrows():
        mapblklot = str(row['mapblklot'])
        if mapblklot in overlay_lookup:
            for col, val in overlay_lookup[mapblklot].items():
                public_gdf.loc[idx, col] = val

    write_geojson(public_gdf, INPUT_FILES['public_parcels'])
    return public_gdf


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    raw_parcels_df = read_csv(INPUT_FILES['parcels'])
    initial_count = len(df)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    geom_gdf = gpd.GeoDataFrame(
        df[['mapblklot']],
        geometry=df['shape'].apply(wkt.loads),
        crs='EPSG:4326'
    )
    geom_gdf.to_file(OUTPUT_DIR / 'parcels.geojson', driver='GeoJSON')
    print(f'  Wrote output/parcels.geojson ({len(geom_gdf):,} features)')

    overlay_df = df[OVERLAY_COLS].copy()
    overlay_df.to_csv(OUTPUT_DIR / 'parcels-overlay.csv', index=False)
    print(f'  Wrote output/parcels-overlay.csv ({len(overlay_df):,} rows)')

    model_df = df[MODEL_COLS].copy()
    model_df = model_df.rename(columns={'mapblklot': 'BlockLot'})
    model_df.to_csv(OUTPUT_DIR / 'parcels-model.csv', index=False)
    print(f'  Wrote output/parcels-model.csv ({len(model_df):,} rows)')

    print('Enriching public parcels...')
    _enrich_public_parcels(raw_parcels_df)

    print('Copying to public/data...')
    shutil.copy(OUTPUT_DIR / 'parcels.geojson', PUBLIC_DIR / 'parcels.geojson')
    shutil.copy(OUTPUT_DIR / 'parcels-overlay.csv', PUBLIC_DIR / 'parcels-overlay.csv')
    shutil.copy(OUTPUT_DIR / 'parcels-model.csv', PUBLIC_DIR / 'parcels-model.csv')
    print('  Copied output files to public/data/')

    write_csv(df, STEP_DIR / 'output.csv')

    return {'input': initial_count, 'output': len(df)}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,}")
