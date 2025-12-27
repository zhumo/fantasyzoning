def fill_res_dummy(parcels_df, land_use_df):
    result = parcels_df.copy()

    missing_res_dummy_mask = result['Res_Dummy'].isna()
    land_use_lookup = land_use_df.set_index('mapblklot')['resunits'].to_dict()

    result.loc[missing_res_dummy_mask, 'Res_Units'] = result.loc[missing_res_dummy_mask, 'mapblklot'].map(land_use_lookup)

    res_units_numeric = result.loc[missing_res_dummy_mask, 'Res_Units'].str.replace(',', '').astype(float)
    result.loc[missing_res_dummy_mask, 'Res_Dummy'] = (res_units_numeric > 0).astype(int).astype(str)

    return result


def fill_building_sqft(parcels_df, land_use_df):
    result = parcels_df.copy()

    missing_sqft_mask = result['Tot_Existing_SqFt'].isna()
    res_lookup = land_use_df.set_index('mapblklot')['res'].to_dict()

    result.loc[missing_sqft_mask, 'Tot_Existing_SqFt'] = result.loc[missing_sqft_mask, 'mapblklot'].map(res_lookup)
    result.loc[missing_sqft_mask, 'Tot_Existing_SqFt'] = result.loc[missing_sqft_mask, 'Tot_Existing_SqFt'].str.replace(',', '').astype(float)
    result.loc[missing_sqft_mask, 'Bldg_SqFt_1000'] = result.loc[missing_sqft_mask, 'Tot_Existing_SqFt'] / 1000

    return result
