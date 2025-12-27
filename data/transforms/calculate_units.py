import numpy as np
import pandas as pd

PROB_WEIGHTS = {
    'Intercept': -1.6226,
    'Height_Ft': 0.0017,
    'Area_1000': 0.0049,
    'Env_1000_Area_Height': 0.0002,
    'Bldg_SqFt_1000': -0.0023,
    'Res_Dummy': -0.8231,
    'Historic': -1.0378,
    'Const_Costs_Real': -0.0992,
    'Zillow_Price_Real': 0.0143,
    'SDB_2016_5Plus': 0.6303,
    'zp_OfficeComm': 4.2634,
    'zp_DRMulti_RTO': 4.2450,
    'zp_FBDMulti_RTO': 5.0508,
    'zp_PDRInd': 3.4115,
    'zp_Public': 1.2491,
    'zp_Redev': 4.5361,
    'zp_RH2': 0.2674,
    'zp_RH3_RM1': 1.3187,
    'DIST_SBayshore': -1.4824,
    'DIST_BernalHts': -1.7011,
    'DIST_Scentral': -1.7307,
    'DIST_Central': -1.1523,
    'DIST_BuenaVista': -2.5369,
    'DIST_Northeast': -1.4171,
    'DIST_WestAddition': -0.6831,
    'DIST_SOMA': -0.0756,
    'DIST_InnerSunset': -1.6187,
    'DIST_Richmond': -2.8019,
    'DIST_Ingleside': -1.8670,
    'DIST_OuterSunset': -2.6147,
    'DIST_Marina': -1.2492,
    'DIST_Mission': -1.0938
}

UNITS_WEIGHTS = {
    'Intercept': 0.0,
    'Env_1000_Area_Height': 0.4252,
    'SDB_2016_5Plus_EnvFull': 0.4385,
    'Zoning_DR_EnvFull': -0.1601
}

MACRO_SCENARIOS = {
    2026: {'costs': 112.723, 'priceLow': 78.091, 'priceHigh': 78.091},
    2027: {'costs': 112.723, 'priceLow': 77.203, 'priceHigh': 77.203},
    2028: {'costs': 112.723, 'priceLow': 78.537, 'priceHigh': 86.719},
    2029: {'costs': 112.723, 'priceLow': 79.895, 'priceHigh': 96.236},
    2030: {'costs': 112.723, 'priceLow': 81.275, 'priceHigh': 105.752},
    2031: {'costs': 112.723, 'priceLow': 82.680, 'priceHigh': 115.268},
    2032: {'costs': 112.723, 'priceLow': 84.108, 'priceHigh': 124.784},
    2033: {'costs': 112.723, 'priceLow': 85.562, 'priceHigh': 128.587},
    2034: {'costs': 112.723, 'priceLow': 87.041, 'priceHigh': 132.506},
    2035: {'costs': 112.723, 'priceLow': 88.545, 'priceHigh': 136.544},
    2036: {'costs': 112.723, 'priceLow': 90.075, 'priceHigh': 140.706},
    2037: {'costs': 112.723, 'priceLow': 91.631, 'priceHigh': 144.994},
    2038: {'costs': 112.723, 'priceLow': 93.215, 'priceHigh': 149.413},
    2039: {'costs': 112.723, 'priceLow': 94.826, 'priceHigh': 153.966},
    2040: {'costs': 112.723, 'priceLow': 96.464, 'priceHigh': 158.659},
    2041: {'costs': 112.723, 'priceLow': 98.131, 'priceHigh': 163.494},
    2042: {'costs': 112.723, 'priceLow': 99.827, 'priceHigh': 168.477},
    2043: {'costs': 112.723, 'priceLow': 101.552, 'priceHigh': 173.611},
    2044: {'costs': 112.723, 'priceLow': 103.307, 'priceHigh': 178.902},
    2045: {'costs': 112.723, 'priceLow': 105.092, 'priceHigh': 184.355}
}

PARCEL_FIELDS = [
    'Height_Ft', 'Area_1000', 'Env_1000_Area_Height', 'Bldg_SqFt_1000',
    'Res_Dummy', 'Historic', 'SDB_2016_5Plus',
    'zp_OfficeComm', 'zp_DRMulti_RTO', 'zp_FBDMulti_RTO', 'zp_PDRInd',
    'zp_Public', 'zp_Redev', 'zp_RH2', 'zp_RH3_RM1',
    'DIST_SBayshore', 'DIST_BernalHts', 'DIST_Scentral', 'DIST_Central',
    'DIST_BuenaVista', 'DIST_Northeast', 'DIST_WestAddition', 'DIST_SOMA',
    'DIST_InnerSunset', 'DIST_Richmond', 'DIST_Ingleside', 'DIST_OuterSunset',
    'DIST_Marina', 'DIST_Mission'
]


def _to_numeric_series(series):
    if series.dtype == object:
        return pd.to_numeric(series.str.replace(',', ''), errors='coerce').fillna(0)
    return pd.to_numeric(series, errors='coerce').fillna(0)


def _calc_20_year_prob_vectorized(parcel_z, scenario):
    prob_not_developed = np.ones(len(parcel_z))
    for year in range(2026, 2046):
        macro = MACRO_SCENARIOS[year]
        price = macro['priceHigh'] if scenario == 'high' else macro['priceLow']
        z = PROB_WEIGHTS['Intercept'] + PROB_WEIGHTS['Const_Costs_Real'] * macro['costs'] + PROB_WEIGHTS['Zillow_Price_Real'] * price + parcel_z
        annual_prob = 1 / (1 + np.exp(-z))
        prob_not_developed *= (1 - annual_prob)
    return 1 - prob_not_developed


def calculate_expected_units(parcels_df):
    result = parcels_df.copy()

    parcel_z = np.zeros(len(result))
    for field in PARCEL_FIELDS:
        if field in result.columns:
            parcel_z += PROB_WEIGHTS[field] * _to_numeric_series(result[field]).values

    env = _to_numeric_series(result['Env_1000_Area_Height']).values
    sdb_env = _to_numeric_series(result['SDB_2016_5Plus_EnvFull']).values
    zoning_dr = _to_numeric_series(result['Zoning_DR_EnvFull']).values

    units = UNITS_WEIGHTS['Env_1000_Area_Height'] * env + UNITS_WEIGHTS['SDB_2016_5Plus_EnvFull'] * sdb_env + UNITS_WEIGHTS['Zoning_DR_EnvFull'] * zoning_dr
    units = np.maximum(0, units)

    prob_low = _calc_20_year_prob_vectorized(parcel_z, 'low')
    prob_high = _calc_20_year_prob_vectorized(parcel_z, 'high')

    result['fzp_expected_units_low'] = prob_low * units
    result['fzp_expected_units_high'] = prob_high * units

    return result
