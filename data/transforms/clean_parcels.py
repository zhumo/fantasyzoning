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
