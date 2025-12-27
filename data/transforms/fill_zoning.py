import pandas as pd
import geopandas as gpd
from shapely import wkt

ZP_MAPPING = {
    'zp_RH2': [
        'RH-2',
    ],
    'zp_RH3_RM1': [
        'RH-3', 'RM-1',
    ],
    'zp_OfficeComm': [
        'C-2', 'C-3-G', 'C-3-O', 'C-3-O(SD)', 'C-3-R', 'C-3-S', 'C-M', 'CMUO', 'MUO', 'WMUO',
    ],
    'zp_DRMulti_RTO': [
        'NC-1', 'NC-2', 'NC-3', 'NC-S', 'RC-3', 'RC-4', 'RM-2', 'RM-3', 'RM-4', 'RSD', 'SLR', 'SSO',
        'NCD', 'NCD-24TH-MISSION', 'NCD-24TH-NOE-VALLEY', 'NCD-BROADWAY', 'NCD-CASTRO', 'NCD-COLE VALLEY',
        'NCD-CORTLAND AVENUE', 'NCD-EXCELSIOR OUTER MISSION', 'NCD-FILLMORE', 'NCD-GEARY BOULEVARD',
        'NCD-HAIGHT', 'NCD-HAYES', 'NCD-INNER BALBOA STREET', 'NCD-INNER CLEMENT', 'NCD-INNER SUNSET',
        'NCD-INNER TARAVAL STREET', 'NCD-IRVING', 'NCD-JAPANTOWN', 'NCD-JUDAH', 'NCD-LAKESIDE VILLAGE',
        'NCD-LOWER HAIGHT STREET', 'NCD-LOWER POLK STREET', 'NCD-MISSION BERNAL', 'NCD-NORIEGA',
        'NCD-NORTH BEACH', 'NCD-OUTER BALBOA STREET', 'NCD-OUTER CLEMENT', 'NCD-PACIFIC', 'NCD-POLK',
        'NCD-SACRAMENTO', 'NCD-SAN BRUNO AVENUE', 'NCD-TARAVAL', 'NCD-UNION', 'NCD-UPPER FILLMORE',
        'NCD-UPPER MARKET', 'NCD-VALENCIA', 'NCD-WEST PORTAL', 'NCD-BAYVIEW',
    ],
    'zp_FBDMulti_RTO': [
        'NCT', 'NCT-1', 'NCT-2', 'NCT-3', 'NCT-DIVISADERO', 'NCT-FOLSOM', 'NCT-GLEN PARK', 'NCT-HAYES',
        'NCT-MISSION', 'NCT-OCEAN', 'NCT-SOMA', 'NCT-UPPER MARKET',
        'RTO', 'RTO-1', 'RTO-C', 'RTO-M',
        'DTR', 'MUR', 'MUG', 'RCD', 'RED', 'RED-MX', 'RH DTR', 'SB-DTR', 'SPD', 'TB DTR', 'UMU', 'WMUG',
        'PM-MU1', 'PM-MU2', 'PM-R', 'P70-MU', 'MR-MU',
    ],
    'zp_PDRInd': [
        'M-1', 'M-2', 'PDR-1', 'PDR-1-B', 'PDR-1-D', 'PDR-1-G', 'PDR-2', 'SALI', 'SLI',
    ],
    'zp_Public': [
        'P', 'PM-CF', 'PM-OS', 'MB-O', 'MB-OS',
    ],
    'zp_Redev': [
        'HP-RA', 'MB-RA', 'MISS BAY N RED', 'MISS BAY S RED', 'MISS BAY S PLN',
    ],
}

CODE_TO_ZP = {}
for zp_col, codes in ZP_MAPPING.items():
    for code in codes:
        CODE_TO_ZP[code] = zp_col

ZP_COLS = ['zp_OfficeComm', 'zp_DRMulti_RTO', 'zp_FBDMulti_RTO', 'zp_PDRInd', 'zp_Public', 'zp_Redev', 'zp_RH2', 'zp_RH3_RM1']


def fill_zoning_from_spatial_join(parcels_df, zoning_district_gdf):
    result = parcels_df.copy()

    missing_zoning_mask = result['FZP Planning Code'].isna()

    missing_parcels = result[missing_zoning_mask].copy()
    missing_parcels['geometry'] = missing_parcels['shape'].apply(wkt.loads)
    missing_gdf = gpd.GeoDataFrame(missing_parcels, geometry='geometry', crs='EPSG:4326')

    missing_gdf_projected = missing_gdf.to_crs('EPSG:2227')
    missing_gdf['centroid'] = missing_gdf_projected.geometry.centroid.to_crs('EPSG:4326')

    centroid_gdf = missing_gdf.set_geometry('centroid')
    joined = gpd.sjoin(centroid_gdf, zoning_district_gdf[['geometry', 'zoning']], how='left', predicate='within')

    zoning_lookup = joined.set_index(joined.index)['zoning'].to_dict()
    result.loc[missing_zoning_mask, 'FZP Planning Code'] = result.loc[missing_zoning_mask].index.map(zoning_lookup)

    return result


def _get_zp_col(planning_code):
    if pd.isna(planning_code):
        return None
    code = planning_code.split(';')[0].strip()
    return CODE_TO_ZP.get(code, None)


def fill_zp_columns(parcels_df):
    result = parcels_df.copy()

    missing_zp_mask = result['zp_RH2'].isna()

    for col in ZP_COLS:
        result.loc[missing_zp_mask, col] = '0'

    for idx in result[missing_zp_mask].index:
        planning_code = result.loc[idx, 'FZP Planning Code']
        zp_col = _get_zp_col(planning_code)
        if zp_col:
            result.loc[idx, zp_col] = '1'

    return result
