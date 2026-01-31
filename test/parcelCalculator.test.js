import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { ParcelCalculator } from '../src/parcelCalculator.js'
import constructionCosts from '../src/data/construction-costs.json'
import zillowRePrices from '../src/data/zillow-re-prices.json'
import { parseNumericCSV } from '../src/helpers.js'

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

describe('ParcelCalculator model properties', () => {
  it('macro data covers 2026-2045', () => {
    for (let year = 2026; year <= 2045; year++) {
      expect(constructionCosts[year]).toBeDefined()
      expect(zillowRePrices[year]).toBeDefined()
      expect(zillowRePrices[year].low).toBeDefined()
      expect(zillowRePrices[year].high).toBeDefined()
    }
  })

  it('high prices diverge from low prices after 2027', () => {
    expect(zillowRePrices[2027].low).toBe(zillowRePrices[2027].high)
    expect(zillowRePrices[2028].high).toBeGreaterThan(zillowRePrices[2028].low)
  })

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
