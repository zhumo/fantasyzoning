import geopandas as gpd

SDB_COLS = ['SDB_2016_5Plus', 'SDB_2016_5Plus_EnvFull', 'Zoning_DR_EnvFull']


def fill_sdb_columns(parcels_df):
    result = parcels_df.copy()

    for col in SDB_COLS:
        missing_mask = result[col].isna() | (result[col] == '')
        result.loc[missing_mask, col] = '0'

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
