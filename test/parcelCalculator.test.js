import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { ParcelCalculator, MACRO_SCENARIOS } from '../src/parcelCalculator.js'
import { parseNumericCSV } from '../src/helpers.js'

const BASELINE_PARCEL = {
  Height_Ft: 65,
  Area_1000: 5.5,
  Bldg_SqFt_1000: 2.0,
  Res_Dummy: 0,
  Historic: 0,
  Zoning_DR_EnvFull: 0,
  zp_OfficeComm: 0,
  zp_DRMulti_RTO: 0,
  zp_FBDMulti_RTO: 0,
  zp_PDRInd: 0,
  zp_Public: 0,
  zp_Redev: 0,
  zp_RH2: 0,
  zp_RH3_RM1: 0,
  DIST_SBayshore: 0,
  DIST_BernalHts: 0,
  DIST_Scentral: 0,
  DIST_Central: 0,
  DIST_BuenaVista: 0,
  DIST_Northeast: 0,
  DIST_WestAddition: 0,
  DIST_SOMA: 0,
  DIST_InnerSunset: 0,
  DIST_Richmond: 0,
  DIST_Ingleside: 0,
  DIST_OuterSunset: 0,
  DIST_Marina: 0,
  DIST_Mission: 0,
}

const HISTORIC_PARCEL = {
  ...BASELINE_PARCEL,
  Historic: 1,
}

const DR_ZONING_PARCEL = {
  ...BASELINE_PARCEL,
  Zoning_DR_EnvFull: 35.75,
}

const NON_SDB_PARCEL = {
  ...BASELINE_PARCEL,
  Height_Ft: 131,
  Area_1000: 2.73,
}

describe('sigmoid', () => {
  it('sigmoid(0) = 0.5', () => {
    expect(ParcelCalculator.sigmoid(0)).toBe(0.5)
  })

  it('sigmoid approaches 0 for large negative z', () => {
    expect(ParcelCalculator.sigmoid(-100)).toBeCloseTo(0, 10)
  })

  it('sigmoid approaches 1 for large positive z', () => {
    expect(ParcelCalculator.sigmoid(100)).toBeCloseTo(1, 10)
  })

  it('sigmoid is monotonically increasing', () => {
    expect(ParcelCalculator.sigmoid(1)).toBeGreaterThan(ParcelCalculator.sigmoid(0))
    expect(ParcelCalculator.sigmoid(0)).toBeGreaterThan(ParcelCalculator.sigmoid(-1))
  })
})

describe('ParcelCalculator null handling', () => {
  it('calcAnnualProbability returns null for missing parcel field', () => {
    const incomplete = { Height_Ft: 65, Area_1000: 5.5 }
    const calc = new ParcelCalculator(incomplete)
    expect(calc.calcAnnualProbability(2030, 'low')).toBeNull()
  })

  it('calcUnitsIfRedeveloped returns null for missing Zoning_DR_EnvFull', () => {
    const incomplete = { Height_Ft: 65, Area_1000: 5.5 }
    const calc = new ParcelCalculator(incomplete)
    expect(calc.getUnitsIfRedeveloped()).toBeNull()
  })

  it('getExpectedUnitsLow returns null when probability is null', () => {
    const incomplete = { Height_Ft: 65, Area_1000: 5.5 }
    const calc = new ParcelCalculator(incomplete)
    expect(calc.getExpectedUnitsLow()).toBeNull()
  })

  it('getExpectedUnitsHigh returns null when probability is null', () => {
    const incomplete = { Height_Ft: 65, Area_1000: 5.5 }
    const calc = new ParcelCalculator(incomplete)
    expect(calc.getExpectedUnitsHigh()).toBeNull()
  })
})

describe('ParcelCalculator with fixtures', () => {
  it('calcUnitsIfRedeveloped for baseline parcel (SDB-eligible)', () => {
    const calc = new ParcelCalculator(BASELINE_PARCEL)
    expect(calc.getUnitsIfRedeveloped()).toBeCloseTo(30.8773, 2)
  })

  it('calcUnitsIfRedeveloped for non-SDB parcel', () => {
    const calc = new ParcelCalculator(NON_SDB_PARCEL)
    expect(calc.getUnitsIfRedeveloped()).toBeCloseTo(15.2064, 2)
  })

  it('DR zoning reduces units', () => {
    const calc = new ParcelCalculator(DR_ZONING_PARCEL)
    expect(calc.getUnitsIfRedeveloped()).toBeCloseTo(25.1530, 2)
  })

  it('historic parcels have lower probability than non-historic', () => {
    const baseCalc = new ParcelCalculator(BASELINE_PARCEL)
    const historicCalc = new ParcelCalculator(HISTORIC_PARCEL)
    expect(historicCalc.getProbabilityLow()).toBeLessThan(baseCalc.getProbabilityLow())
  })

  it('higher envelope produces more units', () => {
    const baseCalc = new ParcelCalculator(BASELINE_PARCEL)
    const higherEnvelope = { ...BASELINE_PARCEL, Height_Ft: 130 }
    const higherCalc = new ParcelCalculator(higherEnvelope)
    expect(higherCalc.getUnitsIfRedeveloped()).toBeGreaterThan(baseCalc.getUnitsIfRedeveloped())
  })

  it('SDB parcels produce more units than non-SDB at same envelope', () => {
    const sdbCalc = new ParcelCalculator(BASELINE_PARCEL)
    const nonSdbCalc = new ParcelCalculator(NON_SDB_PARCEL)
    expect(sdbCalc.getUnitsIfRedeveloped()).toBeGreaterThan(nonSdbCalc.getUnitsIfRedeveloped())
  })

  it('high scenario produces more expected units than low', () => {
    const calc = new ParcelCalculator(BASELINE_PARCEL)
    expect(calc.getExpectedUnitsHigh()).toBeGreaterThanOrEqual(calc.getExpectedUnitsLow())
  })
})

describe('ParcelCalculator derivation functions', () => {
  it('computeEnvelope calculates correctly', () => {
    expect(ParcelCalculator.computeEnvelope({ Area_1000: 10, Height_Ft: 100 })).toBe(100)
    expect(ParcelCalculator.computeEnvelope({ Area_1000: 5, Height_Ft: 40 })).toBe(20)
  })

  it('computeSdbQualification returns boolean based on parcel', () => {
    expect(ParcelCalculator.computeSdbQualification({ Area_1000: 10, Height_Ft: 100 })).toBe(true)
    expect(ParcelCalculator.computeSdbQualification({ Area_1000: 0.9, Height_Ft: 100 })).toBe(false)
    expect(ParcelCalculator.computeSdbQualification({ Area_1000: 10, Height_Ft: 131 })).toBe(false)
  })

  it('prepareParcel derives all fields', () => {
    const parcel = { Area_1000: 10, Height_Ft: 100 }
    const prepared = ParcelCalculator.prepareParcel(parcel)
    expect(prepared.Env_1000_Area_Height).toBe(100)
    expect(prepared.SDB_2016_5Plus).toBe(true)
    expect(prepared.SDB_2016_5Plus_EnvFull).toBe(100)
  })

  it('prepareParcel sets SDB fields to 0 when not qualified', () => {
    const parcel = { Area_1000: 0.5, Height_Ft: 50 }
    const prepared = ParcelCalculator.prepareParcel(parcel)
    expect(prepared.Env_1000_Area_Height).toBe(2.5)
    expect(prepared.SDB_2016_5Plus).toBe(false)
    expect(prepared.SDB_2016_5Plus_EnvFull).toBe(0)
  })
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadParcelsModel() {
  const csvPath = join(__dirname, '../public/data/parcels-model.csv')
  const content = readFileSync(csvPath, 'utf-8')
  return parseNumericCSV(content)
}

const parcels = loadParcelsModel()

describe('ParcelCalculator with real parcel data', () => {
  it(`loads ${parcels.length.toLocaleString()} parcels from parcels-model.csv`, () => {
    expect(parcels.length).toBeGreaterThan(100000)
  })

  // CLAUDE: OK TO LET THIS TEST FAIL. USER WILL FIX IT EVENTUALLY.
  it('JS calculator matches CSV pre-computed values for most parcels', () => {
    const tolerance = 0.01
    let matchCount = 0

    for (const parcel of parcels) {
      const calc = new ParcelCalculator(parcel)
      const calculatedLow = calc.getExpectedUnitsLow()
      const expectedLow = parcel.fzp_expected_units_low

      if (expectedLow === 0 && calculatedLow === 0) {
        matchCount++
      } else if (expectedLow > 0) {
        const relDiff = Math.abs(calculatedLow - expectedLow) / expectedLow
        if (relDiff < tolerance) matchCount++
      }
    }

    const matchRate = matchCount / parcels.length
    expect(matchRate).toBeGreaterThan(0.97)
  })

  // CLAUDE: OK TO LET THIS TEST FAIL. USER WILL FIX IT EVENTUALLY.
  it('calculated totals are within 5% of CSV pre-computed totals', () => {
    let calcTotalLow = 0
    let calcTotalHigh = 0
    let csvTotalLow = 0
    let csvTotalHigh = 0

    for (const parcel of parcels) {
      const calc = new ParcelCalculator(parcel)
      calcTotalLow += calc.getExpectedUnitsLow()
      calcTotalHigh += calc.getExpectedUnitsHigh()
      csvTotalLow += parcel.fzp_expected_units_low
      csvTotalHigh += parcel.fzp_expected_units_high
    }

    const lowDiff = Math.abs(calcTotalLow - csvTotalLow) / csvTotalLow
    const highDiff = Math.abs(calcTotalHigh - csvTotalHigh) / csvTotalHigh

    expect(lowDiff).toBeLessThan(0.05)
    expect(highDiff).toBeLessThan(0.05)
  })

  it('CSV pre-computed totals are reasonable (>10k units)', () => {
    let csvTotalLow = 0
    let csvTotalHigh = 0

    for (const parcel of parcels) {
      csvTotalLow += parcel.fzp_expected_units_low
      csvTotalHigh += parcel.fzp_expected_units_high
    }

    expect(csvTotalLow).toBeGreaterThan(10000)
    expect(csvTotalHigh).toBeGreaterThan(csvTotalLow)
  })
})

function createMacroScenariosWithCost(customCost) {
  const modified = {}
  for (const year in MACRO_SCENARIOS) {
    modified[year] = {
      ...MACRO_SCENARIOS[year],
      construction_costs: customCost
    }
  }
  return modified
}

describe('ParcelCalculator with custom macro scenarios', () => {
  let baseCalc;
  beforeEach(() => {
    baseCalc = new ParcelCalculator(BASELINE_PARCEL)
  })

  describe('lower macro', () => {
    it('lower construction cost increases expected units', () => {
      const lowerMacro = createMacroScenariosWithCost(100.0)

      const lowerCalc = new ParcelCalculator(BASELINE_PARCEL, lowerMacro)

      expect(lowerCalc.getExpectedUnitsLow()).toBeGreaterThan(baseCalc.getExpectedUnitsLow())
      expect(lowerCalc.getExpectedUnitsHigh()).toBeGreaterThan(baseCalc.getExpectedUnitsHigh())
    })
  })

  describe('higher macro', () => {
    it('lower costs increase probability', () => {
      const highCostMacro = createMacroScenariosWithCost(200)

      const higherCalc = new ParcelCalculator(BASELINE_PARCEL, highCostMacro)

      expect(higherCalc.getExpectedUnitsLow()).toBeLessThan(baseCalc.getExpectedUnitsLow())
      expect(higherCalc.getExpectedUnitsHigh()).toBeLessThan(baseCalc.getExpectedUnitsHigh())
    })
  })
})

describe('ParcelCalculator model properties', () => {
  it('higher envelope produces more units', () => {
    const baseParcel = parcels.find(p => p.Env_1000_Area_Height > 0 && p.Env_1000_Area_Height < 50)
    const higherEnvelope = { ...baseParcel, Height_Ft: baseParcel.Height_Ft * 2 }

    const baseCalc = new ParcelCalculator(baseParcel)
    const higherCalc = new ParcelCalculator(higherEnvelope)

    expect(higherCalc.getUnitsIfRedeveloped()).toBeGreaterThan(baseCalc.getUnitsIfRedeveloped())
  })

  it('historic parcels have lower redevelopment probability', () => {
    const nonHistoric = parcels.find(p => p.Historic === 0 && p.Height_Ft > 40)
    const historicVersion = { ...nonHistoric, Historic: 1 }

    const nonHistoricCalc = new ParcelCalculator(nonHistoric)
    const historicCalc = new ParcelCalculator(historicVersion)

    expect(historicCalc.getProbabilityLow()).toBeLessThan(nonHistoricCalc.getProbabilityLow())
  })

  it('SDB parcels produce more units', () => {
    const parcel = parcels.find(p => p.Env_1000_Area_Height > 20 && p.Height_Ft <= 130)
    const envelope = parcel.Area_1000 * parcel.Height_Ft / 10
    const withoutSDB = { ...parcel, Height_Ft: 131, Area_1000: envelope * 10 / 131 }

    const withSDBCalc = new ParcelCalculator(parcel)
    const withoutSDBCalc = new ParcelCalculator(withoutSDB)

    expect(withSDBCalc.getUnitsIfRedeveloped()).toBeGreaterThan(withoutSDBCalc.getUnitsIfRedeveloped())
  })

  it('high scenario produces more expected units than low', () => {
    const parcel = parcels.find(p => p.Env_1000_Area_Height > 10)
    const calc = new ParcelCalculator(parcel)

    expect(calc.getExpectedUnitsHigh()).toBeGreaterThanOrEqual(calc.getExpectedUnitsLow())
  })
})
