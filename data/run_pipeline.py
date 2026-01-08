#!/usr/bin/env python3
"""
Data pipeline for SF rezoning analysis.

Transforms raw parcel data into model-ready outputs:
- parcels.geojson: Parcel geometries
- parcels-overlay.csv: Parcel attributes for UI tooltip
- parcels-model.csv: Model features for unit calculation

Usage:
    python run_pipeline.py
"""

import os
import shutil
import pandas as pd
import geopandas as gpd
from shapely import wkt

from transforms import (
    deduplicate_by_mapblklot,
    fill_missing_addresses,
    merge_model_data,
    remove_public_parcels,
    remove_non_housing_parcels,
    remove_shipyard_parcels,
    enrich_public_parcels,
    fill_missing_area,
    remove_presidio_parcels,
    fill_missing_districts,
    fill_res_dummy,
    fill_building_sqft,
    fill_zoning_from_spatial_join,
    fill_zp_columns,
    fill_height_from_spatial_join,
    remove_open_space_parcels,
    fill_envelope,
    fill_sdb_columns,
    compute_historic_from_districts,
    fill_historic_columns,
    calculate_expected_units,
    fill_transit_distance,
)


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


def load_source_data():
    print('Loading source data...')

    raw_parcels_df = pd.read_csv('active-and-retired-parcels.csv', dtype=str)
    print(f'  raw_parcels_df: {len(raw_parcels_df):,} rows')

    raw_model_df = pd.read_csv('input/parcels-w-fzp-model-data.csv', dtype=str)
    print(f'  raw_model_df: {len(raw_model_df):,} rows')

    raw_public_parcels_df = gpd.read_file('../public/data/public-parcels.geojson')
    print(f'  raw_public_parcels_df: {len(raw_public_parcels_df):,} rows')

    raw_land_use_df = pd.read_csv('input/land-use.csv', dtype=str)
    print(f'  raw_land_use_df: {len(raw_land_use_df):,} rows')

    raw_zoning_district_df = pd.read_csv('input/zoning-district.csv', dtype=str)
    raw_zoning_district_gdf = gpd.GeoDataFrame(
        raw_zoning_district_df,
        geometry=gpd.GeoSeries.from_wkt(raw_zoning_district_df['the_geom']),
        crs='EPSG:4326'
    )
    print(f'  raw_zoning_district_gdf: {len(raw_zoning_district_gdf):,} rows')

    raw_height_bulk_df = pd.read_csv('input/height-and-bulk-districts.csv', dtype=str)
    raw_height_bulk_gdf = gpd.GeoDataFrame(
        raw_height_bulk_df,
        geometry=gpd.GeoSeries.from_wkt(raw_height_bulk_df['the_geom']),
        crs='EPSG:4326'
    )
    print(f'  raw_height_bulk_gdf: {len(raw_height_bulk_gdf):,} rows')

    raw_historic_districts_df = pd.read_csv('input/historic-districts.csv', dtype=str)
    raw_historic_districts_gdf = gpd.GeoDataFrame(
        raw_historic_districts_df,
        geometry=gpd.GeoSeries.from_wkt(raw_historic_districts_df['the_geom']),
        crs='EPSG:4326'
    )
    print(f'  raw_historic_districts_gdf: {len(raw_historic_districts_gdf):,} rows')

    return {
        'raw_parcels_df': raw_parcels_df,
        'raw_model_df': raw_model_df,
        'raw_public_parcels_df': raw_public_parcels_df,
        'raw_land_use_df': raw_land_use_df,
        'raw_zoning_district_gdf': raw_zoning_district_gdf,
        'raw_height_bulk_gdf': raw_height_bulk_gdf,
        'raw_historic_districts_gdf': raw_historic_districts_gdf,
    }


def clean_parcels(parcels_df, data):
    print('\n=== Cleaning parcels ===')

    print(f'Deduplicating by mapblklot...')
    before = len(parcels_df)
    parcels_df = deduplicate_by_mapblklot(parcels_df)
    print(f'  {before:,} -> {len(parcels_df):,} rows')

    print(f'Filling missing addresses...')
    parcels_df = fill_missing_addresses(parcels_df, data['raw_land_use_df'])

    print(f'Merging model data...')
    before = len(parcels_df)
    parcels_df = merge_model_data(parcels_df, data['raw_model_df'], data['raw_parcels_df'])
    print(f'  {before:,} -> {len(parcels_df):,} rows (kept parcels with model data or active status)')

    print(f'Removing public parcels...')
    before = len(parcels_df)
    parcels_df = remove_public_parcels(parcels_df, data['raw_public_parcels_df'])
    print(f'  {before:,} -> {len(parcels_df):,} rows')

    return parcels_df


def fill_area_and_districts(parcels_df):
    print('\n=== Filling area and districts ===')

    print(f'Filling missing area...')
    parcels_df = fill_missing_area(parcels_df)

    print(f'Removing Presidio parcels...')
    before = len(parcels_df)
    parcels_df = remove_presidio_parcels(parcels_df)
    print(f'  {before:,} -> {len(parcels_df):,} rows')

    print(f'Filling missing district flags...')
    parcels_df = fill_missing_districts(parcels_df)

    return parcels_df


def fill_land_use(parcels_df, data):
    print('\n=== Filling land use data ===')

    print(f'Filling Res_Dummy...')
    parcels_df = fill_res_dummy(parcels_df, data['raw_land_use_df'])

    print(f'Filling building sqft...')
    parcels_df = fill_building_sqft(parcels_df, data['raw_land_use_df'])

    return parcels_df


def fill_zoning(parcels_df, data):
    print('\n=== Filling zoning data ===')

    print(f'Filling zoning from spatial join...')
    parcels_df = fill_zoning_from_spatial_join(parcels_df, data['raw_zoning_district_gdf'])

    print(f'Filling zp_* columns...')
    parcels_df = fill_zp_columns(parcels_df)

    return parcels_df


def fill_height(parcels_df, data, public_parcels_path):
    print('\n=== Filling height data ===')

    print(f'Filling height from spatial join...')
    parcels_df = fill_height_from_spatial_join(parcels_df, data['raw_height_bulk_gdf'])

    print(f'Removing open space parcels (height >= 1000)...')
    before = len(parcels_df)
    parcels_df, _ = remove_open_space_parcels(parcels_df, public_parcels_path)
    print(f'  {before:,} -> {len(parcels_df):,} rows')

    print(f'Removing non-housing parcels...')
    before = len(parcels_df)
    parcels_df = remove_non_housing_parcels(parcels_df, public_parcels_path)
    print(f'  {before:,} -> {len(parcels_df):,} rows')

    print(f'Removing shipyard parcels...')
    before = len(parcels_df)
    parcels_df = remove_shipyard_parcels(parcels_df)
    print(f'  {before:,} -> {len(parcels_df):,} rows')

    return parcels_df


def calculate_derived_fields(parcels_df, data):
    print('\n=== Calculating derived fields ===')

    print(f'Filling envelope...')
    parcels_df = fill_envelope(parcels_df)

    print(f'Filling SDB columns...')
    parcels_df = fill_sdb_columns(parcels_df)

    print(f'Computing historic from districts...')
    parcels_df = compute_historic_from_districts(parcels_df, data['raw_historic_districts_gdf'])

    print(f'Filling historic columns...')
    parcels_df = fill_historic_columns(parcels_df)

    print(f'Calculating expected units...')
    parcels_df = calculate_expected_units(parcels_df)
    print(f"  Total expected units (low): {parcels_df['fzp_expected_units_low'].sum():,.0f}")
    print(f"  Total expected units (high): {parcels_df['fzp_expected_units_high'].sum():,.0f}")

    return parcels_df


def write_outputs(parcels_df, data, public_parcels_path):
    print('\n=== Writing outputs ===')

    os.makedirs('output', exist_ok=True)

    geom_gdf = gpd.GeoDataFrame(
        parcels_df[['mapblklot']],
        geometry=parcels_df['shape'].apply(wkt.loads),
        crs='EPSG:4326'
    )

    print('Calculating transit distances...')
    geom_gdf = fill_transit_distance(
        geom_gdf,
        '../public/data/transit-bart.geojson',
        '../public/data/transit-muni.geojson',
        '../public/data/transit-caltrain.geojson'
    )
    parcels_df['distance_to_transit'] = geom_gdf['distance_to_transit'].values

    geom_gdf = geom_gdf.drop(columns=['distance_to_transit'])
    geom_gdf.to_file('output/parcels.geojson', driver='GeoJSON')
    print(f'  Wrote output/parcels.geojson ({len(geom_gdf):,} features)')

    overlay_df = parcels_df[OVERLAY_COLS].copy()
    overlay_df.to_csv('output/parcels-overlay.csv', index=False)
    print(f'  Wrote output/parcels-overlay.csv ({len(overlay_df):,} rows)')

    model_df = parcels_df[MODEL_COLS].copy()
    model_df = model_df.rename(columns={'mapblklot': 'BlockLot'})
    model_df.to_csv('output/parcels-model.csv', index=False)
    print(f'  Wrote output/parcels-model.csv ({len(model_df):,} rows)')

    print('\nEnriching public parcels...')
    enrich_public_parcels(public_parcels_path, data['raw_parcels_df'])

    return parcels_df


def copy_to_public():
    print('\n=== Copying to public/data ===')

    shutil.copy('output/parcels.geojson', '../public/data/parcels.geojson')
    shutil.copy('output/parcels-overlay.csv', '../public/data/parcels-overlay.csv')
    shutil.copy('output/parcels-model.csv', '../public/data/parcels-model.csv')
    print('  Copied output files to ../public/data/')


def main():
    public_parcels_path = '../public/data/public-parcels.geojson'

    data = load_source_data()

    parcels_df = data['raw_parcels_df'].copy()

    parcels_df = clean_parcels(parcels_df, data)
    parcels_df = fill_area_and_districts(parcels_df)
    parcels_df = fill_land_use(parcels_df, data)
    parcels_df = fill_zoning(parcels_df, data)
    parcels_df = fill_height(parcels_df, data, public_parcels_path)
    parcels_df = calculate_derived_fields(parcels_df, data)
    parcels_df = write_outputs(parcels_df, data, public_parcels_path)

    copy_to_public()

    print(f'\n=== Pipeline complete ===')
    print(f'Final parcel count: {len(parcels_df):,}')


if __name__ == '__main__':
    main()
