PLANNING_TO_DIST = {
    'South Bayshore': 'DIST_SBayshore',
    'Bernal Heights': 'DIST_BernalHts',
    'South Central': 'DIST_Scentral',
    'Central': 'DIST_Central',
    'Buena Vista': 'DIST_BuenaVista',
    'Northeast': 'DIST_Northeast',
    'Western Addition': 'DIST_WestAddition',
    'South of Market': 'DIST_SOMA',
    'Inner Sunset': 'DIST_InnerSunset',
    'Richmond': 'DIST_Richmond',
    'Ingleside': 'DIST_Ingleside',
    'Outer Sunset': 'DIST_OuterSunset',
    'Marina': 'DIST_Marina',
    'Mission': 'DIST_Mission',
}


def remove_presidio_parcels(parcels_df):
    return parcels_df[parcels_df['planning_district'] != 'Presidio']


def fill_missing_districts(parcels_df):
    result = parcels_df.copy()

    dist_cols = [c for c in result.columns if c.startswith('DIST_')]
    missing_dist_mask = result[dist_cols[0]].isna()

    for col in dist_cols:
        result.loc[missing_dist_mask, col] = '0'

    for district, col in PLANNING_TO_DIST.items():
        mask = missing_dist_mask & (result['planning_district'] == district)
        result.loc[mask, col] = '1'

    return result
