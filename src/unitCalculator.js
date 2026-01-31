const SDB_ENVELOPE_THRESHOLD = 9.0
const SDB_HEIGHT_CAP = 130

function computeEnvelope(parcel) {
  return parcel.Area_1000 * parcel.Height_Ft / 10
}

function computeSdbQualification(parcel) {
  const envelope = computeEnvelope(parcel)
  return envelope > SDB_ENVELOPE_THRESHOLD && parcel.Height_Ft <= SDB_HEIGHT_CAP
}

function prepareParcel(parcel) {
  const envelope = computeEnvelope(parcel)
  const sdb = computeSdbQualification(parcel)

  return {
    ...parcel,
    Env_1000_Area_Height: envelope,
    SDB_2016_5Plus: sdb,
    SDB_2016_5Plus_EnvFull: sdb * envelope
  }
}

const PROB_REG_WEIGHTS = {
  Intercept: -1.6226,
  Height_Ft: 0.0017,
  Area_1000: 0.0049,
  Env_1000_Area_Height: 0.0002,
  Bldg_SqFt_1000: -0.0023,
  Res_Dummy: -0.8231,
  Historic: -1.0378,
  Const_Costs_Real: -0.0992,
  Zillow_Price_Real: 0.0143,
  SDB_2016_5Plus: 0.6303,
  zp_OfficeComm: 4.2634,
  zp_DRMulti_RTO: 4.2450,
  zp_FBDMulti_RTO: 5.0508,
  zp_PDRInd: 3.4115,
  zp_Public: 1.2491,
  zp_Redev: 4.5361,
  zp_RH2: 0.2674,
  zp_RH3_RM1: 1.3187,
  DIST_SBayshore: -1.4824,
  DIST_BernalHts: -1.7011,
  DIST_Scentral: -1.7307,
  DIST_Central: -1.1523,
  DIST_BuenaVista: -2.5369,
  DIST_Northeast: -1.4171,
  DIST_WestAddition: -0.6831,
  DIST_SOMA: -0.0756,
  DIST_InnerSunset: -1.6187,
  DIST_Richmond: -2.8019,
  DIST_Ingleside: -1.8670,
  DIST_OuterSunset: -2.6147,
  DIST_Marina: -1.2492,
  DIST_Mission: -1.0938
}

const UNITS_REG_WEIGHTS = {
  Intercept: 0.0,
  Env_1000_Area_Height: 0.4252,
  SDB_2016_5Plus_EnvFull: 0.4385,
  Zoning_DR_EnvFull: -0.1601
}

const MACRO_SCENARIOS = {
  2026: { construction_costs: 112.723, zillow_re_prices: { low: 78.091, high: 78.091   } },
  2027: { construction_costs: 112.723, zillow_re_prices: { low: 77.203, high: 77.203   } },
  2028: { construction_costs: 112.723, zillow_re_prices: { low: 78.537, high: 86.719   } },
  2029: { construction_costs: 112.723, zillow_re_prices: { low: 79.895, high: 96.236   } },
  2030: { construction_costs: 112.723, zillow_re_prices: { low: 81.275, high: 105.752  } },
  2031: { construction_costs: 112.723, zillow_re_prices: { low: 82.680, high: 115.268  } },
  2032: { construction_costs: 112.723, zillow_re_prices: { low: 84.108, high: 124.784  } },
  2033: { construction_costs: 112.723, zillow_re_prices: { low: 85.562, high: 128.587  } },
  2034: { construction_costs: 112.723, zillow_re_prices: { low: 87.041, high: 132.506  } },
  2035: { construction_costs: 112.723, zillow_re_prices: { low: 88.545, high: 136.544  } },
  2036: { construction_costs: 112.723, zillow_re_prices: { low: 90.075, high: 140.706  } },
  2037: { construction_costs: 112.723, zillow_re_prices: { low: 91.631, high: 144.994  } },
  2038: { construction_costs: 112.723, zillow_re_prices: { low: 93.215, high: 149.413  } },
  2039: { construction_costs: 112.723, zillow_re_prices: { low: 94.826, high: 153.966  } },
  2040: { construction_costs: 112.723, zillow_re_prices: { low: 96.464, high: 158.659  } },
  2041: { construction_costs: 112.723, zillow_re_prices: { low: 98.131, high: 163.494  } },
  2042: { construction_costs: 112.723, zillow_re_prices: { low: 99.827, high: 168.477  } },
  2043: { construction_costs: 112.723, zillow_re_prices: { low: 101.552, high: 173.611 } },
  2044: { construction_costs: 112.723, zillow_re_prices: { low: 103.307, high: 178.902 } },
  2045: { construction_costs: 112.723, zillow_re_prices: { low: 105.092, high: 184.355 } },
}

const MACRO_FIELDS = ['Intercept', 'Const_Costs_Real', 'Zillow_Price_Real']

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z))
}

function calcAnnualProbability(parcel, year, scenario) {
  if(!["high", "low"].includes(scenario)) {
    throw new Error(`Invalid pricing scenario for parcel calculation: ${scenario}. Must be "high" or "low".`)
  }
  const macro = MACRO_SCENARIOS[year]

  let z = PROB_REG_WEIGHTS.Intercept
  z += PROB_REG_WEIGHTS.Const_Costs_Real * macro.construction_costs
  z += PROB_REG_WEIGHTS.Zillow_Price_Real * macro.zillow_re_prices[scenario]

  for (const field of Object.keys(PROB_REG_WEIGHTS)) {
    if (MACRO_FIELDS.includes(field)) continue
    if (parcel[field] === undefined) return null
    z += PROB_REG_WEIGHTS[field] * parcel[field]
  }

  return sigmoid(z)
}

function calc20YearProbability(parcel, scenario) {
  let probNotDeveloped = 1.0
  for (const year in MACRO_SCENARIOS) {
    const annualProb = calcAnnualProbability(parcel, year, scenario)
    if (annualProb === null) return null
    probNotDeveloped *= (1 - annualProb)
  }
  return 1 - probNotDeveloped
}

function calcUnitsIfRedeveloped(parcel) {
  for (const field of Object.keys(UNITS_REG_WEIGHTS)) {
    if (field === 'Intercept') continue
    if (parcel[field] === undefined) return null
  }
  let units = UNITS_REG_WEIGHTS.Intercept
  units += UNITS_REG_WEIGHTS.Env_1000_Area_Height * parcel.Env_1000_Area_Height
  units += UNITS_REG_WEIGHTS.SDB_2016_5Plus_EnvFull * parcel.SDB_2016_5Plus_EnvFull
  units += UNITS_REG_WEIGHTS.Zoning_DR_EnvFull * parcel.Zoning_DR_EnvFull
  return Math.max(0, units)
}

function calcExpectedUnits(parcel, scenario) {
  const prepared = prepareParcel(parcel)
  const prob = calc20YearProbability(prepared, scenario)
  const units = calcUnitsIfRedeveloped(prepared)
  if (prob === null || units === null) return null
  return prob * units
}

function calcTotalExpectedUnits(parcels, scenario) {
  return parcels.reduce((sum, parcel) => {
    const units = calcExpectedUnits(parcel, scenario)
    return sum + (units ?? 0)
  }, 0)
}

// CLAUDE: Why is there an export here? What other objects are using these functions?
export const UnitCalculator = {
  calc20YearProbability,
  calcUnitsIfRedeveloped,
  calcExpectedUnits,
  MACRO_SCENARIOS,
  prepareParcel,
  computeEnvelope,
  computeSdbQualification,
}
