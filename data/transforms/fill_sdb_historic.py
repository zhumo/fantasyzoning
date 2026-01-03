import pandas as pd
import geopandas as gpd

SDB_COLS = ['SDB_2016_5Plus', 'SDB_2016_5Plus_EnvFull', 'Zoning_DR_EnvFull']
SDB_ENVELOPE_THRESHOLD = 9.0
SDB_HEIGHT_CAP = 130


def compute_sdb_qualification(parcels_df):
    envelope = pd.to_numeric(parcels_df['Env_1000_Area_Height'], errors='coerce').fillna(0)
    height = pd.to_numeric(parcels_df['Height_Ft'], errors='coerce').fillna(0)

    qualifies = (
        (envelope > SDB_ENVELOPE_THRESHOLD) &
        (height <= SDB_HEIGHT_CAP)
    )
    return qualifies.astype(int).astype(str)


def fill_sdb_columns(parcels_df):
    result = parcels_df.copy()

    missing_sdb_mask = result['SDB_2016_5Plus'].isna() | (result['SDB_2016_5Plus'] == '')

    if missing_sdb_mask.any():
        computed_sdb = compute_sdb_qualification(result)
        result.loc[missing_sdb_mask, 'SDB_2016_5Plus'] = computed_sdb[missing_sdb_mask]

        envelope = pd.to_numeric(result['Env_1000_Area_Height'], errors='coerce').fillna(0)
        sdb_env_full = (computed_sdb == '1').astype(float) * envelope
        result.loc[missing_sdb_mask, 'SDB_2016_5Plus_EnvFull'] = sdb_env_full[missing_sdb_mask].astype(str)

    for col in SDB_COLS:
        still_missing = result[col].isna() | (result[col] == '')
        result.loc[still_missing, col] = '0'

    return result


def compute_historic_from_districts(parcels_df, historic_districts_gdf):
    parcels_gdf = gpd.GeoDataFrame(
        parcels_df,
        geometry=gpd.GeoSeries.from_wkt(parcels_df['shape']),
        crs='EPSG:4326'
    )
    parcels_gdf_projected = parcels_gdf.to_crs('EPSG:2227')
    parcels_gdf['centroid'] = parcels_gdf_projected.geometry.centroid.to_crs('EPSG:4326')
    parcels_centroids_gdf = parcels_gdf.set_geometry('centroid')

    joined = gpd.sjoin(parcels_centroids_gdf, historic_districts_gdf, how='left', predicate='within')
    parcels_in_historic_district = joined[joined['name'].notna()]['mapblklot'].unique()

    result = parcels_df.copy()
    result['in_historic_district'] = result['mapblklot'].isin(parcels_in_historic_district).astype(int).astype(str)

    return result


def fill_historic_columns(parcels_df):
    result = parcels_df.copy()

    missing_historic_mask = (result['historic'].isna() | (result['historic'] == '')) & \
                            (result['Historic'].isna() | (result['Historic'] == ''))
    result.loc[missing_historic_mask, 'historic'] = result.loc[missing_historic_mask, 'in_historic_district']
    result.loc[missing_historic_mask, 'Historic'] = result.loc[missing_historic_mask, 'in_historic_district']

    return result
