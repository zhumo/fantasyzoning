# Transfer Tax Reform Impact on Housing Production

## Summary

This analysis models the impact of eliminating SF's real estate transfer tax on new housing construction. The transfer tax increases construction costs, which reduces the probability of redevelopment. By removing this tax, we estimate an additional **+4,216 to +7,620 units** over 20 years—a 14.6-16.0% increase over the baseline projection of 28,834-47,558 units.

## Methodology

### Estimating Parcel Market Values

To determine transfer tax brackets, we need each parcel's estimated market value. We built a predictive model using SF Assessor data:

1. **Training data**: Historical SF Assessor records identifying parcels that sold and their sale prices
2. **Features**: Parcel characteristics (size, location, zoning, building type, age, bedrooms, bathrooms, etc.)
3. **Model**: Trained to predict market value based on parcel characteristics
4. **Output**: `sf_all_parcels_expected_values_v4.csv` containing predicted market values for all ~195k SF parcels

### Transfer Tax Impact on Construction Costs

Land value is approximately 2x the cost of construction in San Francisco. When a transfer tax is applied to property sales, eliminating the tax reduces land acquisition costs. This has a 2x effect on the effective construction cost index.

### Analysis Steps

1. **Aggregate parcel values**: Sum predicted market values by mapblklot (parcels can have multiple units/blklots)
2. **Determine tax bracket**: Look up the SF transfer tax rate based on total property value
3. **Adjust construction cost**: Reduce the base construction cost index (112.723) by 2x the tax rate
4. **Run projection model**: Use the City Economist's probability/units model with adjusted costs

### SF Transfer Tax Brackets

| Property Value | Tax Rate |
|----------------|----------|
| $100 - $250,000 | 0.50% |
| $250,001 - $999,999 | 0.68% |
| $1,000,000 - $4,999,999 | 0.75% |
| $5,000,000 - $9,999,999 | 2.25% |
| $10,000,000 - $24,999,999 | 5.50% |
| $25,000,000+ | 6.00% |

## Results

### Parcel Distribution by Tax Bracket

| Tax Rate | Parcels | % of Total |
|----------|---------|------------|
| 0.50% | 36,369 | 24.2% |
| 0.68% | 11,177 | 7.4% |
| 0.75% | 96,002 | 63.9% |
| 2.25% | 4,595 | 3.1% |
| 5.50% | 1,663 | 1.1% |
| 6.00% | 342 | 0.2% |
| **Total** | **150,148** | **100%** |

### Expected Units (2x Tax Reduction)

| Scenario | Original | With Reform | Difference |
|----------|----------|-------------|------------|
| Low | 28,834 | 33,050 | **+4,216 (+14.6%)** |
| High | 47,558 | 55,178 | **+7,620 (+16.0%)** |

## Running the Analysis

```bash
npx vite-node analyses/transfer-tax-reform/calculate-expected-units.mjs [path-to-expected-values-csv]
```

The script uses `vite-node` to support importing from the main `src/parcelCalculator.js` module.

## Data Requirements

- `sf_all_parcels_expected_values_v4.csv` - Predicted assessed values by blklot (not committed, 44MB)
- `public/data/parcels-model.csv` - Model features for unit projection

## Date

Analysis performed: March 2025
