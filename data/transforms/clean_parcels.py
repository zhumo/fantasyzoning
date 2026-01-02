import pandas as pd


def deduplicate_by_mapblklot(parcels_df):
    blklots_agg = parcels_df.groupby('mapblklot')['blklot'].apply(lambda x: ','.join(sorted(x))).reset_index()
    blklots_agg.columns = ['mapblklot', 'blklots']

    result = parcels_df.drop_duplicates(subset='mapblklot', keep='first')
    result = result.drop(columns=['blklot', 'block_num', 'lot_num'])
    result = result.merge(blklots_agg, on='mapblklot')

    cols = result.columns.tolist()
    cols.remove('blklots')
    cols.insert(1, 'blklots')
    return result[cols]


def fill_missing_addresses(parcels_df, land_use_df):
    result = parcels_df.copy()
    missing_address_mask = result['from_address_num'].isna() | (result['from_address_num'] == '')

    address_lookup = land_use_df.set_index('mapblklot')[['from_st', 'street', 'st_type']].to_dict('index')

    for idx in result[missing_address_mask].index:
        mapblklot = result.loc[idx, 'mapblklot']
        if mapblklot in address_lookup:
            addr = address_lookup[mapblklot]
            result.loc[idx, 'from_address_num'] = addr['from_st']
            result.loc[idx, 'street_name'] = addr['street']
            result.loc[idx, 'street_type'] = addr['st_type']

    return result


def merge_model_data(parcels_df, model_df, raw_parcels_df):
    blklot_to_mapblklot = raw_parcels_df.set_index('blklot')['mapblklot'].to_dict()
    parcels_blklots = set(raw_parcels_df['blklot'])

    model_df_filtered = model_df[model_df['BlockLot'].isin(parcels_blklots)].copy()
    model_df_filtered['mapblklot'] = model_df_filtered['BlockLot'].map(blklot_to_mapblklot)

    model_cols = [c for c in model_df_filtered.columns if c not in ['BlockLot']]
    model_by_mapblklot = model_df_filtered.drop_duplicates(subset='mapblklot', keep='first')[model_cols]

    result = parcels_df.merge(model_by_mapblklot, on='mapblklot', how='left')

    has_model_data = result['mapblklot'].isin(model_by_mapblklot['mapblklot'])
    is_active = result['active'] == 'true'
    keep_mask = has_model_data | is_active

    return result[keep_mask]


def remove_public_parcels(parcels_df, public_parcels_df):
    public_mapblklots = set(public_parcels_df['mapblklot'])
    return parcels_df[~parcels_df['mapblklot'].isin(public_mapblklots)]


NON_HOUSING_EXACT_ZONES = ['M-1', 'M-2', 'P']
NON_HOUSING_PREFIX_PATTERNS = ['PDR-1-B', 'PDR-1-D', 'PDR-1-G', 'PDR-2', 'TI-OS', 'TI-R', 'TI-MU']
LARGE_PARCEL_AREA_THRESHOLD = 100


def identify_non_housing_parcels(parcels_df):
    def zone_matches_pattern(zone):
        if pd.isna(zone):
            return False
        zone_primary = zone.split(';')[0].strip()
        if zone_primary in NON_HOUSING_EXACT_ZONES:
            return True
        for pattern in NON_HOUSING_PREFIX_PATTERNS:
            if zone_primary.startswith(pattern):
                return True
        return False

    is_non_housing_zone = parcels_df['zoning_code'].apply(zone_matches_pattern)

    area_numeric = pd.to_numeric(parcels_df['Area_1000'], errors='coerce').fillna(0)
    is_large_rh1d = (parcels_df['zoning_code'] == 'RH-1(D)') & (area_numeric > LARGE_PARCEL_AREA_THRESHOLD)

    return is_non_housing_zone | is_large_rh1d


def remove_non_housing_parcels(parcels_df, public_parcels_path):
    import geopandas as gpd
    from shapely import wkt

    non_housing_mask = identify_non_housing_parcels(parcels_df)

    if non_housing_mask.sum() == 0:
        return parcels_df

    non_housing_parcels = parcels_df[non_housing_mask].copy()
    non_housing_parcels['geometry'] = non_housing_parcels['shape'].apply(wkt.loads)
    non_housing_gdf = gpd.GeoDataFrame(non_housing_parcels, geometry='geometry', crs='EPSG:4326')

    existing_public = gpd.read_file(public_parcels_path)
    existing_mapblklots = set(existing_public['mapblklot'])

    new_public = non_housing_gdf[~non_housing_gdf['mapblklot'].isin(existing_mapblklots)]

    if len(new_public) > 0:
        cols_to_keep = [c for c in existing_public.columns if c in new_public.columns]
        new_public_subset = new_public[cols_to_keep]

        combined = pd.concat([existing_public, new_public_subset], ignore_index=True)
        combined.to_file(public_parcels_path, driver='GeoJSON')

    return parcels_df[~non_housing_mask]


def remove_shipyard_parcels(parcels_df):
    missing_zoning = parcels_df['zoning_code'].isna() | (parcels_df['zoning_code'] == '')
    missing_height = parcels_df['Height_Ft'].isna() | (parcels_df['Height_Ft'] == '')
    is_bayview = parcels_df['analysis_neighborhood'] == 'Bayview Hunters Point'

    shipyard_mask = missing_zoning & missing_height & is_bayview
    return parcels_df[~shipyard_mask]


OVERLAY_COLS = [
    'mapblklot', 'from_address_num', 'street_name', 'street_type',
    'analysis_neighborhood', 'zoning_code', 'zoning_district',
    'supervisor_district', 'supname'
]


def enrich_public_parcels(public_parcels_path, raw_parcels_df):
    import geopandas as gpd

    public_gdf = gpd.read_file(public_parcels_path)
    public_mapblklots = set(public_gdf['mapblklot'].astype(str))

    overlay_data = raw_parcels_df[raw_parcels_df['mapblklot'].astype(str).isin(public_mapblklots)].copy()
    overlay_data = overlay_data.drop_duplicates(subset='mapblklot', keep='first')

    available_cols = [c for c in OVERLAY_COLS if c in overlay_data.columns]
    overlay_lookup = overlay_data.set_index('mapblklot')[available_cols[1:]].to_dict('index')

    for idx, row in public_gdf.iterrows():
        mapblklot = str(row['mapblklot'])
        if mapblklot in overlay_lookup:
            for col, val in overlay_lookup[mapblklot].items():
                public_gdf.loc[idx, col] = val

    public_gdf.to_file(public_parcels_path, driver='GeoJSON')
    return public_gdf
