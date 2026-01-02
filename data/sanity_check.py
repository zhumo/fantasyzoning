#!/usr/bin/env python3
import pandas as pd
import numpy as np
import sys
sys.path.insert(0, 'transforms')
from calculate_units import calculate_expected_units, PROB_WEIGHTS, UNITS_WEIGHTS, MACRO_SCENARIOS, PARCEL_FIELDS

print("Loading data...")
model_df = pd.read_csv('../public/data/parcels-model.csv')
overlay_df = pd.read_csv('../public/data/parcels-overlay.csv')
fzp_source = pd.read_csv('input/parcels-w-fzp-model-data.csv')

merged = model_df.merge(overlay_df, left_on='BlockLot', right_on='mapblklot', how='left')
print(f"Model parcels: {len(model_df):,}")
print(f"Overlay parcels: {len(overlay_df):,}")
print(f"FZP source parcels: {len(fzp_source):,}")
print(f"Merged: {len(merged):,}")

print("\n" + "=" * 80)
print("1. DATA COMPLETENESS BY NEIGHBORHOOD")
print("=" * 80)

required_fields = ['Height_Ft_x', 'Area_1000', 'Env_1000_Area_Height', 'Bldg_SqFt_1000',
                   'Res_Dummy', 'Historic', 'SDB_2016_5Plus']

def check_missing(row):
    missing = []
    for field in required_fields:
        val = row.get(field)
        if pd.isna(val):
            missing.append(field.replace('_x', ''))
    return missing if missing else None

merged['missing_fields'] = merged.apply(check_missing, axis=1)
merged['is_calculable'] = merged['missing_fields'].isna()

by_neighborhood = merged.groupby('analysis_neighborhood').agg(
    total_parcels=('BlockLot', 'count'),
    calculable=('is_calculable', 'sum'),
    uncalculable=('is_calculable', lambda x: (~x).sum())
).reset_index()
by_neighborhood['pct_uncalculable'] = (by_neighborhood['uncalculable'] / by_neighborhood['total_parcels'] * 100).round(2)
by_neighborhood = by_neighborhood.sort_values('uncalculable', ascending=False)

print("\nUNCALCULABLE PARCELS BY NEIGHBORHOOD (missing required data)")
print(by_neighborhood[by_neighborhood['uncalculable'] > 0].to_string(index=False))
print(f"\nTotal uncalculable: {merged['is_calculable'].eq(False).sum()}")

uncalculable_parcels = merged[~merged['is_calculable']]
if len(uncalculable_parcels) > 0:
    print("\nSAMPLE UNCALCULABLE PARCELS:")
    cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'missing_fields']
    print(uncalculable_parcels[cols].head(20).to_string(index=False))

print("\n" + "=" * 80)
print("2. UNIT CONTRIBUTION BY NEIGHBORHOOD (FZP Baseline)")
print("=" * 80)

by_neighborhood_units = merged.groupby('analysis_neighborhood').agg(
    total_parcels=('BlockLot', 'count'),
    fzp_units_low=('fzp_expected_units_low', 'sum'),
    fzp_units_high=('fzp_expected_units_high', 'sum'),
    avg_height=('Height_Ft_x', 'mean'),
    avg_area=('Area_1000', 'mean'),
    avg_envelope=('Env_1000_Area_Height', 'mean')
).reset_index()
by_neighborhood_units['units_per_parcel_low'] = (by_neighborhood_units['fzp_units_low'] / by_neighborhood_units['total_parcels']).round(4)
by_neighborhood_units['units_per_parcel_high'] = (by_neighborhood_units['fzp_units_high'] / by_neighborhood_units['total_parcels']).round(4)

display_cols = ['analysis_neighborhood', 'total_parcels', 'fzp_units_low', 'fzp_units_high',
                'units_per_parcel_low', 'units_per_parcel_high', 'avg_height']
print(by_neighborhood_units.sort_values('fzp_units_high', ascending=False)[display_cols].round(2).to_string(index=False))

print(f"\n\nTOTALS:")
print(f"  Low scenario:  {by_neighborhood_units['fzp_units_low'].sum():,.0f} units")
print(f"  High scenario: {by_neighborhood_units['fzp_units_high'].sum():,.0f} units")

print("\n" + "=" * 80)
print("3. BLANKET UPZONING SIMULATION")
print("=" * 80)

def simulate_blanket_upzoning(df, min_height):
    sim = df.copy()
    current_height = pd.to_numeric(sim['Height_Ft_x'], errors='coerce').fillna(40)
    sim['Height_Ft'] = np.maximum(current_height, min_height)
    sim['Area_1000'] = pd.to_numeric(sim['Area_1000'], errors='coerce').fillna(0)
    sim['Env_1000_Area_Height'] = sim['Area_1000'] * sim['Height_Ft'] / 10

    sdb_zoning = sim['zoning_code'].fillna('').str.contains('RTO|NCT|WMUG', case=False, regex=True)
    sdb_eligible = sdb_zoning & (sim['Env_1000_Area_Height'] > 9.0) & (sim['Height_Ft'] <= 130)
    sim['SDB_2016_5Plus'] = sdb_eligible.astype(int)
    sim['SDB_2016_5Plus_EnvFull'] = np.where(sdb_eligible, sim['Env_1000_Area_Height'], 0)

    return calculate_expected_units(sim)

print("Simulating blanket upzoning scenarios...")
upzone_85 = simulate_blanket_upzoning(merged, 85)
upzone_130 = simulate_blanket_upzoning(merged, 130)

merged['upzone_85_low'] = upzone_85['fzp_expected_units_low']
merged['upzone_85_high'] = upzone_85['fzp_expected_units_high']
merged['upzone_130_low'] = upzone_130['fzp_expected_units_low']
merged['upzone_130_high'] = upzone_130['fzp_expected_units_high']

comparison = merged.groupby('analysis_neighborhood').agg(
    parcels=('BlockLot', 'count'),
    fzp_high=('fzp_expected_units_high', 'sum'),
    upzone_85_high=('upzone_85_high', 'sum'),
    upzone_130_high=('upzone_130_high', 'sum')
).reset_index()

comparison['85ft_gain'] = comparison['upzone_85_high'] - comparison['fzp_high']
comparison['130ft_gain'] = comparison['upzone_130_high'] - comparison['fzp_high']

print("\nBLANKET UPZONING: UNIT GAIN BY NEIGHBORHOOD (High Scenario)")
print(comparison.sort_values('130ft_gain', ascending=False).round(0).to_string(index=False))

print(f"\n\nTOTAL GAINS:")
print(f"  85ft blanket (high): {comparison['85ft_gain'].sum():,.0f} additional units")
print(f"  130ft blanket (high): {comparison['130ft_gain'].sum():,.0f} additional units")

print("\n" + "=" * 80)
print("4. HIGH P(REDEVELOPMENT) PARCELS")
print("=" * 80)

def calc_prob(row):
    parcel_z = 0
    for field in PARCEL_FIELDS:
        col = field + '_x' if field == 'Height_Ft' else field
        val = row.get(col, 0)
        if pd.isna(val):
            val = 0
        parcel_z += PROB_WEIGHTS[field] * float(val)

    prob_not = 1.0
    for year in range(2026, 2046):
        macro = MACRO_SCENARIOS[year]
        z = PROB_WEIGHTS['Intercept'] + PROB_WEIGHTS['Const_Costs_Real'] * macro['costs'] + PROB_WEIGHTS['Zillow_Price_Real'] * macro['priceHigh'] + parcel_z
        prob_not *= (1 - (1 / (1 + np.exp(-z))))
    return 1 - prob_not

print("Calculating P(redevelopment) for all parcels...")
merged['prob_redev_high'] = merged.apply(calc_prob, axis=1)

high_prob = merged[merged['prob_redev_high'] > 0.5].sort_values('prob_redev_high', ascending=False)

print(f"\nPARCELS WITH P(REDEVELOPMENT) > 50% ({len(high_prob)} parcels)")
cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'Area_1000',
        'Env_1000_Area_Height', 'prob_redev_high', 'fzp_expected_units_high']
print(high_prob[cols].head(30).round(3).to_string(index=False))

print(f"\nP(redev) distribution:")
print(merged['prob_redev_high'].describe())

print("\n" + "=" * 80)
print("5. HIGH P(REDEVELOPMENT) BY ZONING CODE")
print("=" * 80)
by_zoning = merged.groupby('zoning_code').agg(
    count=('BlockLot', 'count'),
    avg_prob=('prob_redev_high', 'mean'),
    max_prob=('prob_redev_high', 'max'),
    total_units=('fzp_expected_units_high', 'sum')
).reset_index()
by_zoning = by_zoning[by_zoning['count'] >= 10]
print(by_zoning.sort_values('avg_prob', ascending=False).head(20).round(3).to_string(index=False))

print("\n" + "=" * 80)
print("6. TOP 50 PARCELS BY EXPECTED UNITS")
print("=" * 80)

high_units = merged.nlargest(50, 'fzp_expected_units_high')
cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'Area_1000',
        'Env_1000_Area_Height', 'SDB_2016_5Plus', 'prob_redev_high', 'fzp_expected_units_high']
print(high_units[cols].round(2).to_string(index=False))

print("\n" + "=" * 80)
print("7. TOP 50 PARCELS BY UNIT CAPACITY (if redeveloped)")
print("=" * 80)

merged['units_if_redev'] = (UNITS_WEIGHTS['Env_1000_Area_Height'] * merged['Env_1000_Area_Height'].fillna(0) +
                            UNITS_WEIGHTS['SDB_2016_5Plus_EnvFull'] * merged['SDB_2016_5Plus_EnvFull'].fillna(0) +
                            UNITS_WEIGHTS['Zoning_DR_EnvFull'] * merged['Zoning_DR_EnvFull'].fillna(0)).clip(lower=0)

high_capacity = merged.nlargest(50, 'units_if_redev')
cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'Area_1000',
        'Env_1000_Area_Height', 'units_if_redev', 'prob_redev_high', 'fzp_expected_units_high']
print(high_capacity[cols].round(2).to_string(index=False))

print("\n" + "=" * 80)
print("8. EAST-SIDE VS WEST-SIDE COMPARISON")
print("=" * 80)

fzp_blocklots = set(fzp_source['BlockLot'].astype(str))
merged['in_fzp_source'] = merged['BlockLot'].astype(str).isin(fzp_blocklots)

print(f"Parcels in FZP source: {merged['in_fzp_source'].sum():,}")
print(f"Parcels NOT in FZP source (east-side + other): {(~merged['in_fzp_source']).sum():,}")

east_side = merged[~merged['in_fzp_source']]
west_side = merged[merged['in_fzp_source']]

def summarize_group(df, name):
    return {
        'group': name,
        'parcels': len(df),
        'avg_height': df['Height_Ft_x'].mean(),
        'avg_area': df['Area_1000'].mean(),
        'avg_envelope': df['Env_1000_Area_Height'].mean(),
        'avg_prob_redev': df['prob_redev_high'].mean(),
        'total_units_high': df['fzp_expected_units_high'].sum(),
        'units_per_parcel': df['fzp_expected_units_high'].sum() / len(df) if len(df) > 0 else 0,
        'sdb_pct': df['SDB_2016_5Plus'].mean() * 100,
        'historic_pct': df['Historic'].mean() * 100,
        'residential_pct': df['Res_Dummy'].mean() * 100
    }

print("\nWest (FZP) vs East (non-FZP) Summary:")
for grp in [summarize_group(west_side, 'West (FZP)'), summarize_group(east_side, 'East (non-FZP)')]:
    print(f"\n{grp['group']}:")
    for k, v in grp.items():
        if k != 'group':
            if isinstance(v, float):
                print(f"  {k}: {v:,.2f}")
            else:
                print(f"  {k}: {v:,}")

print("\n" + "=" * 80)
print("9. EAST-SIDE PARCELS BY NEIGHBORHOOD")
print("=" * 80)

east_by_hood = east_side.groupby('analysis_neighborhood').agg(
    parcels=('BlockLot', 'count'),
    units_high=('fzp_expected_units_high', 'sum'),
    avg_prob=('prob_redev_high', 'mean'),
    avg_height=('Height_Ft_x', 'mean')
).reset_index()

print(east_by_hood.sort_values('parcels', ascending=False).round(3).to_string(index=False))

print("\n" + "=" * 80)
print("10. SDB HEURISTIC VALIDATION")
print("=" * 80)

sdb_zoning_match = merged['zoning_code'].fillna('').str.contains('RTO|NCT|WMUG', case=False, regex=True)
sdb_envelope_match = merged['Env_1000_Area_Height'] > 9.0
sdb_height_match = merged['Height_Ft_x'] <= 130

predicted_sdb = sdb_zoning_match & sdb_envelope_match & sdb_height_match
actual_sdb = merged['SDB_2016_5Plus'] == 1

cm = pd.crosstab(actual_sdb, predicted_sdb, rownames=['Actual SDB'], colnames=['Predicted SDB'])
print("\nConfusion Matrix:")
print(cm)

tp = ((predicted_sdb) & (actual_sdb)).sum()
fp = ((predicted_sdb) & (~actual_sdb)).sum()
fn = ((~predicted_sdb) & (actual_sdb)).sum()
tn = ((~predicted_sdb) & (~actual_sdb)).sum()

precision = tp / (tp + fp) if (tp + fp) > 0 else 0
recall = tp / (tp + fn) if (tp + fn) > 0 else 0
accuracy = (tp + tn) / len(merged)

print(f"\nPrecision: {precision:.4f}")
print(f"Recall: {recall:.4f}")
print(f"Accuracy: {accuracy:.4f}")
print(f"False positives: {fp}")
print(f"False negatives: {fn}")

false_positives = merged[(predicted_sdb) & (~actual_sdb)]
false_negatives = merged[(~predicted_sdb) & (actual_sdb)]

if len(false_positives) > 0:
    print("\n--- Sample False Positives ---")
    cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'Env_1000_Area_Height', 'in_fzp_source']
    print(false_positives[cols].head(10).to_string(index=False))

if len(false_negatives) > 0:
    print("\n--- Sample False Negatives ---")
    cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'Env_1000_Area_Height', 'in_fzp_source']
    print(false_negatives[cols].head(10).to_string(index=False))

print("\n" + "=" * 80)
print("11. ENVELOPE FORMULA DISCREPANCIES")
print("=" * 80)

merged['calc_envelope'] = merged['Area_1000'] * merged['Height_Ft_x'] / 10
merged['envelope_diff'] = (merged['Env_1000_Area_Height'] - merged['calc_envelope']).abs()

large_diffs = merged[merged['envelope_diff'] > 0.5]

print(f"Parcels with Env diff > 0.5: {len(large_diffs)}")
print(f"\nEnvelope diff distribution:")
print(merged['envelope_diff'].describe())

if len(large_diffs) > 0:
    print("\n--- Sample Large Discrepancies ---")
    cols = ['BlockLot', 'analysis_neighborhood', 'Height_Ft_x', 'Area_1000', 'Env_1000_Area_Height', 'calc_envelope', 'envelope_diff']
    print(large_diffs[cols].head(20).round(3).to_string(index=False))

print("\n" + "=" * 80)
print("12. ZONING CATEGORY COVERAGE")
print("=" * 80)

zp_cols = [c for c in merged.columns if c.startswith('zp_')]
merged['has_zoning_cat'] = merged[zp_cols].sum(axis=1) > 0

no_zoning_cat = merged[~merged['has_zoning_cat']]

print(f"Parcels without zoning category: {len(no_zoning_cat):,} ({len(no_zoning_cat)/len(merged)*100:.1f}%)")
print("\nBy zoning_code:")
print(no_zoning_cat['zoning_code'].value_counts().head(20))

print("\n" + "=" * 80)
print("13. DISTRICT ASSIGNMENT CHECK")
print("=" * 80)

dist_cols = [c for c in merged.columns if c.startswith('DIST_')]
merged['district_count'] = merged[dist_cols].sum(axis=1)

print(f"Parcels with no district: {(merged['district_count'] == 0).sum()}")
print(f"Parcels with 1 district: {(merged['district_count'] == 1).sum()}")
print(f"Parcels with >1 district: {(merged['district_count'] > 1).sum()}")

no_district = merged[merged['district_count'] == 0]
if len(no_district) > 0:
    print("\nNeighborhoods of parcels with no district:")
    print(no_district['analysis_neighborhood'].value_counts().head(20))

print("\n" + "=" * 80)
print("14. UNUSUAL COMBINATIONS")
print("=" * 80)

very_tall = merged[merged['Height_Ft_x'] > 200]
print(f"\nVery tall parcels (>200 ft): {len(very_tall)}")
if len(very_tall) > 0:
    cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'Area_1000', 'fzp_expected_units_high']
    print(very_tall.nlargest(10, 'Height_Ft_x')[cols].to_string(index=False))

very_large = merged[merged['Area_1000'] > 50]
print(f"\nVery large parcels (>50k sqft): {len(very_large)}")
if len(very_large) > 0:
    cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'Area_1000', 'fzp_expected_units_high']
    print(very_large.nlargest(20, 'Area_1000')[cols].round(1).to_string(index=False))

historic_high_prob = merged[(merged['Historic'] == 1) & (merged['prob_redev_high'] > 0.3)]
print(f"\nHistoric parcels with P(redev) > 30%: {len(historic_high_prob)}")
if len(historic_high_prob) > 0:
    cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'prob_redev_high', 'fzp_expected_units_high']
    print(historic_high_prob.nlargest(10, 'prob_redev_high')[cols].round(3).to_string(index=False))

rh1_high_prob = merged[(merged['zoning_code'].fillna('').str.startswith('RH-1')) & (merged['prob_redev_high'] > 0.2)]
print(f"\nRH-1 parcels with P(redev) > 20%: {len(rh1_high_prob)}")
if len(rh1_high_prob) > 0:
    cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'Area_1000', 'prob_redev_high']
    print(rh1_high_prob.nlargest(10, 'prob_redev_high')[cols].round(3).to_string(index=False))

print("\n" + "=" * 80)
print("15. FZP SOURCE DATA COMPARISON")
print("=" * 80)

fzp_source['BlockLot'] = fzp_source['BlockLot'].astype(str)
fzp_compare = merged[merged['in_fzp_source']].merge(fzp_source, left_on='BlockLot', right_on='BlockLot', suffixes=('_calc', '_fzp'))

print(f"Parcels available for FZP comparison: {len(fzp_compare):,}")

def compare_field(calc_col, fzp_col, name):
    calc = pd.to_numeric(fzp_compare[calc_col], errors='coerce').fillna(0)
    fzp = pd.to_numeric(fzp_compare[fzp_col], errors='coerce').fillna(0)
    diff = (calc - fzp).abs()
    return {
        'field': name,
        'exact_match': int((diff < 0.001).sum()),
        'close_match': int((diff < 1.0).sum()),
        'large_diff': int((diff >= 1.0).sum()),
        'max_diff': diff.max()
    }

comparisons = [
    compare_field('Height_Ft_x', 'Height_Ft', 'Height_Ft'),
    compare_field('Area_1000_calc', 'Area_1000_fzp', 'Area_1000'),
    compare_field('Env_1000_Area_Height_calc', 'Env_1000_Area_Height_fzp', 'Envelope'),
    compare_field('SDB_2016_5Plus_calc', 'SDB_2016_5Plus_fzp', 'SDB'),
    compare_field('Historic_calc', 'Historic_fzp', 'Historic'),
    compare_field('SDB_2016_5Plus_EnvFull_calc', 'SDB_2016_5Plus_EnvFull_fzp', 'SDB_EnvFull'),
]

print("\nFZP SOURCE VS CALCULATED COMPARISON")
comparison_df = pd.DataFrame(comparisons)
print(comparison_df.to_string(index=False))

fzp_compare['height_diff'] = (pd.to_numeric(fzp_compare['Height_Ft_x'], errors='coerce').fillna(0) -
                               pd.to_numeric(fzp_compare['Height_Ft'], errors='coerce').fillna(0)).abs()

height_mismatch = fzp_compare[fzp_compare['height_diff'] > 1.0]
print(f"\nParcels with height mismatch > 1ft: {len(height_mismatch)}")
if len(height_mismatch) > 0:
    cols = ['BlockLot', 'analysis_neighborhood', 'zoning_code', 'Height_Ft_x', 'Height_Ft', 'height_diff']
    print(height_mismatch.nlargest(20, 'height_diff')[cols].round(1).to_string(index=False))

print("\n" + "=" * 80)
print("16. OVERALL SUMMARY")
print("=" * 80)

summary = {
    'Total parcels': len(merged),
    'Calculable parcels': int(merged['is_calculable'].sum()),
    'Uncalculable parcels': int((~merged['is_calculable']).sum()),
    'In FZP source': int(merged['in_fzp_source'].sum()),
    'East-side (non-FZP)': int((~merged['in_fzp_source']).sum()),
    'With SDB qualification': int(merged['SDB_2016_5Plus'].sum()),
    'Historic': int(merged['Historic'].sum()),
    'Residential': int(merged['Res_Dummy'].sum()),
    '---': '---',
    'FZP Units (low)': merged['fzp_expected_units_low'].sum(),
    'FZP Units (high)': merged['fzp_expected_units_high'].sum(),
    '85ft Blanket Units (high)': merged['upzone_85_high'].sum(),
    '130ft Blanket Units (high)': merged['upzone_130_high'].sum(),
    '----': '----',
    'Avg P(redev) high': merged['prob_redev_high'].mean(),
    'Max P(redev) high': merged['prob_redev_high'].max(),
    'Parcels P(redev) > 50%': int((merged['prob_redev_high'] > 0.5).sum()),
}

for k, v in summary.items():
    if isinstance(v, float):
        print(f"{k}: {v:,.2f}")
    elif isinstance(v, int):
        print(f"{k}: {v:,}")
    else:
        print(f"{k}")

print("\n" + "=" * 80)
print("17. KEY FINDINGS TO INVESTIGATE")
print("=" * 80)

findings = []

uncalc_pct = (~merged['is_calculable']).sum() / len(merged) * 100
if uncalc_pct > 0.1:
    findings.append(f"⚠️  {uncalc_pct:.2f}% parcels are uncalculable (missing required data)")
else:
    findings.append(f"✅ Only {uncalc_pct:.2f}% parcels are uncalculable")

east_units = merged[~merged['in_fzp_source']]['fzp_expected_units_high'].sum()
total_units = merged['fzp_expected_units_high'].sum()
east_pct = east_units / total_units * 100
findings.append(f"📊 East-side parcels contribute {east_units:,.0f} units ({east_pct:.1f}% of total)")

high_prob_count = (merged['prob_redev_high'] > 0.5).sum()
if high_prob_count > 0:
    findings.append(f"🔥 {high_prob_count:,} parcels have P(redevelopment) > 50%")

expected_low = 10098
expected_high = 17845
actual_low = merged['fzp_expected_units_low'].sum()
actual_high = merged['fzp_expected_units_high'].sum()

findings.append(f"📈 Expected ~10k/~18k units (FZP), got {actual_low:,.0f}/{actual_high:,.0f}")
if abs(actual_high - expected_high) / expected_high > 0.1:
    findings.append(f"⚠️  Total units differ from expected FZP by {(actual_high-expected_high)/expected_high*100:.0f}%")

for f in findings:
    print(f)

print("\nDone!")
