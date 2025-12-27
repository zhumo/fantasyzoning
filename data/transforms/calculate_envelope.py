def fill_envelope(parcels_df):
    result = parcels_df.copy()

    missing_env_mask = result['Env_1000_Area_Height'].isna()

    area_numeric = result.loc[missing_env_mask, 'Area_1000'].str.replace(',', '').astype(float)
    height_numeric = result.loc[missing_env_mask, 'Height_Ft'].str.replace(',', '').astype(float)
    result.loc[missing_env_mask, 'Env_1000_Area_Height'] = (area_numeric * height_numeric / 10).astype(str)

    return result
