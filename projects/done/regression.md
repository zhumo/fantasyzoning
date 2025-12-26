# Expected Units Calculator - Design Proposal

## Overview

A JavaScript object that calculates expected housing units per parcel by combining two regression models:
1. **Probability of Redevelopment** - likelihood a parcel gets redeveloped in a given year
2. **Number of Units** - how many units are built if redeveloped

Expected Units = P(redevelopment over 20 years) × Units if Redeveloped

## Data Inputs

### Parcel Data (from fzp-zoning.csv)
Each row contains:
- `BlockLot` - unique identifier
- `Height_Ft`, `Area_1000`, `Env_1000_Area_Height`, `Bldg_SqFt_1000`
- `Res_Dummy`, `Historic`
- `SDB_2016_5Plus` - binary indicator (0/1) for transit-rich zone
- Zoning dummies: `zp_OfficeComm`, `zp_DRMulti_RTO`, `zp_FBDMulti_RTO`, `zp_PDRInd`, `zp_Public`, `zp_Redev`, `zp_RH2`, `zp_RH3_RM1`
- District dummies: `DIST_SBayshore`, `DIST_BernalHts`, etc.
- `SDB_2016_5Plus_EnvFull`, `Zoning_DR_EnvFull`

### Macro Scenarios (from construction-and-price-scenarios.csv)
Year-by-year values for 2026-2045:
- `Construc_Costs_Real` - same for both scenarios
- `Price-Low Growth` / `Price-High Growth` - diverge starting 2028

## Model 1: Probability of Redevelopment

### Formula (Logistic Regression)
```
z = β₀ + Σ(βᵢ × xᵢ)
p = 1 / (1 + e^(-z))
```

Where z is the log-odds (linear predictor) and p is the annual probability.

### Coefficients (from prob-redevelopment-regression-weights.csv)

| Variable | Coefficient |
|----------|-------------|
| Intercept | -1.6226 |
| Height_Ft | 0.0017 |
| Area_1000 | 0.0049 |
| Env_1000_Area_Height | 0.0002 |
| Bldg_SqFt_1000 | -0.0023 |
| Res_Dummy | -0.8231 |
| Historic | -1.0378 |
| Const_Costs_Real | -0.0992 |
| Zillow_Price_Real | 0.0143 |
| SDB_2016_5Plus | 0.6303 |
| zp_OfficeComm | 4.2634 |
| zp_DRMulti_RTO | 4.2450 |
| zp_FBDMulti_RTO | 5.0508 |
| zp_PDRInd | 3.4115 |
| zp_Public | 1.2491 |
| zp_Redev | 4.5361 |
| zp_RH2 | 0.2674 |
| zp_RH3_RM1 | 1.3187 |
| DIST_SBayshore | -1.4824 |
| DIST_BernalHts | -1.7011 |
| DIST_Scentral | -1.7307 |
| DIST_Central | -1.1523 |
| DIST_BuenaVista | -2.5369 |
| DIST_Northeast | -1.4171 |
| DIST_WestAddition | -0.6831 |
| DIST_SOMA | -0.0756 |
| DIST_InnerSunset | -1.6187 |
| DIST_Richmond | -2.8019 |
| DIST_Ingleside | -1.8670 |
| DIST_OuterSunset | -2.6147 |
| DIST_Marina | -1.2492 |
| DIST_Mission | -1.0938 |

### Time-Varying Variables
- `Const_Costs_Real` and `Zillow_Price_Real` change each year
- These come from the macro scenario file

## Model 2: Number of Units (if redeveloped)

### Formula (Linear Regression)
```
units = β₀ + Σ(βᵢ × xᵢ)
```

### Coefficients (from num-units-regression-weights.csv)
| Variable | Coefficient |
|----------|-------------|
| Intercept | 0.0000 |
| Env_1000_Area_Height | 0.4252 |
| SDB_2016_5Plus_EnvFull | 0.4385 |
| Zoning_DR_EnvFull | -0.1601 |

## 20-Year Probability Aggregation

### Approach: Complement Product Method

The city economist described calculating annual probabilities then aggregating to a 20-year probability. The standard statistical approach:

1. Calculate annual probability pᵢ for each year i (2026-2045)
2. Probability of NOT being developed in year i = (1 - pᵢ)
3. Probability of NOT being developed in ANY year = ∏(1 - pᵢ)
4. **20-year probability** = 1 - ∏(1 - pᵢ)

```javascript
// For each parcel:
let probNotDeveloped = 1.0;
for (let year = 2026; year <= 2045; year++) {
  const annualProb = calculateAnnualProbability(parcel, year, scenario);
  probNotDeveloped *= (1 - annualProb);
}
const prob20Year = 1 - probNotDeveloped;
```

This correctly handles:
- Probabilities that vary by year (due to changing costs/prices)
- The intuition that more years = higher cumulative probability
- Probabilities never exceed 1.0

## API Design

```javascript
const UnitCalculator = {
  // Load regression weights and macro scenarios
  probWeights: { /* from CSV */ },
  unitsWeights: { /* from CSV */ },
  macroScenarios: { /* from CSV, indexed by year */ },

  // Calculate annual redevelopment probability for one parcel/year
  calcAnnualProbability(parcel, year, scenario) {
    const costs = this.macroScenarios[year].costs;
    const price = scenario === 'high'
      ? this.macroScenarios[year].priceHigh
      : this.macroScenarios[year].priceLow;

    let z = this.probWeights.Intercept;
    z += this.probWeights.Height_Ft * parcel.Height_Ft;
    z += this.probWeights.Area_1000 * parcel.Area_1000;
    z += this.probWeights.Env_1000_Area_Height * parcel.Env_1000_Area_Height;
    z += this.probWeights.Bldg_SqFt_1000 * parcel.Bldg_SqFt_1000;
    z += this.probWeights.Res_Dummy * parcel.Res_Dummy;
    z += this.probWeights.Historic * parcel.Historic;
    z += this.probWeights.SDB_2016_5Plus * parcel.SDB_2016_5Plus;
    // ... zoning dummies (zp_*) and district dummies (DIST_*)
    z += this.probWeights.Const_Costs_Real * costs;
    z += this.probWeights.Zillow_Price_Real * price;

    return 1 / (1 + Math.exp(-z));  // sigmoid
  },

  // Aggregate to 20-year probability
  calc20YearProbability(parcel, scenario) {
    let probNotDeveloped = 1.0;
    for (let year = 2026; year <= 2045; year++) {
      const annualProb = this.calcAnnualProbability(parcel, year, scenario);
      probNotDeveloped *= (1 - annualProb);
    }
    return 1 - probNotDeveloped;
  },

  // Calculate units if redeveloped
  calcUnitsIfRedeveloped(parcel) {
    let units = this.unitsWeights.Intercept;
    units += this.unitsWeights.Env_1000_Area_Height * parcel.Env_1000_Area_Height;
    units += this.unitsWeights.SDB_2016_5Plus_EnvFull * parcel.SDB_2016_5Plus_EnvFull;
    units += this.unitsWeights.Zoning_DR_EnvFull * parcel.Zoning_DR_EnvFull;
    return Math.max(0, units);  // units can't be negative
  },

  // Main entry point: expected units for one parcel
  calcExpectedUnits(parcel, scenario) {
    const prob = this.calc20YearProbability(parcel, scenario);
    const units = this.calcUnitsIfRedeveloped(parcel);
    return prob * units;
  },

  // Sum across all parcels
  calcTotalExpectedUnits(parcels, scenario) {
    return parcels.reduce((sum, p) => sum + this.calcExpectedUnits(p, scenario), 0);
  }
};
```

## Test Cases (Validation Targets)

| Scenario | Zoning | Expected Total Units |
|----------|--------|---------------------|
| Low Growth | Current | 1,594 |
| Low Growth | FZP | 10,098 |
| High Growth | Current | 3,199 |
| High Growth | FZP | 17,845 |

These totals are sums across all ~92,000 parcels.

## Implementation Notes

1. **Parsing coefficients**: The CSV uses parentheses for negatives, e.g., `(1.6226)` = `-1.6226`

2. **Missing districts**: If a parcel doesn't match any DIST_* dummy (all zeros), that's the reference category (likely DIST_Downtown or similar)

3. **Floor on units**: The units calculation could theoretically go negative with the negative Zoning_DR coefficient; should floor at 0

4. **Performance**: With ~92k parcels × 20 years × 2 scenarios, consider caching or batch processing
