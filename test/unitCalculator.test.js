import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { UnitCalculator } from '../src/unitCalculator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

function loadParcelsModel() {
  const csvPath = join(__dirname, '../public/data/parcels-model.csv')
  const content = readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n')
  const headers = parseCSVLine(lines[0])
  const parcels = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVLine(lines[i])
    const parcel = {}
    headers.forEach((header, idx) => {
      const val = values[idx] || ''
      parcel[header] = header === 'BlockLot' ? val : (parseFloat(val) || 0)
    })
    parcels.push(parcel)
  }
  return parcels
}

const parcels = loadParcelsModel()

describe('UnitCalculator with real parcel data', () => {
  it(`loads ${parcels.length.toLocaleString()} parcels from parcels-model.csv`, () => {
    expect(parcels.length).toBeGreaterThan(100000)
  })

  it('JS calculator matches CSV pre-computed values for most parcels', () => {
    const tolerance = 0.01
    let matchCount = 0

    for (const parcel of parcels) {
      const calculatedLow = UnitCalculator.calcExpectedUnits(parcel, 'low')
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

  it('calculated totals are within 5% of CSV pre-computed totals', () => {
    let calcTotalLow = 0
    let calcTotalHigh = 0
    let csvTotalLow = 0
    let csvTotalHigh = 0

    for (const parcel of parcels) {
      calcTotalLow += UnitCalculator.calcExpectedUnits(parcel, 'low')
      calcTotalHigh += UnitCalculator.calcExpectedUnits(parcel, 'high')
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

describe('UnitCalculator model properties', () => {
  it('MACRO_SCENARIOS covers 2026-2045', () => {
    for (let year = 2026; year <= 2045; year++) {
      expect(UnitCalculator.MACRO_SCENARIOS[year]).toBeDefined()
      expect(UnitCalculator.MACRO_SCENARIOS[year].costs).toBeDefined()
      expect(UnitCalculator.MACRO_SCENARIOS[year].priceLow).toBeDefined()
      expect(UnitCalculator.MACRO_SCENARIOS[year].priceHigh).toBeDefined()
    }
  })

  it('high prices diverge from low prices after 2027', () => {
    expect(UnitCalculator.MACRO_SCENARIOS[2027].priceLow)
      .toBe(UnitCalculator.MACRO_SCENARIOS[2027].priceHigh)
    expect(UnitCalculator.MACRO_SCENARIOS[2028].priceHigh)
      .toBeGreaterThan(UnitCalculator.MACRO_SCENARIOS[2028].priceLow)
  })

  it('higher envelope produces more units', () => {
    const baseParcel = parcels.find(p => p.Env_1000_Area_Height > 0 && p.Env_1000_Area_Height < 50)
    const higherEnvelope = { ...baseParcel, Env_1000_Area_Height: baseParcel.Env_1000_Area_Height * 2 }

    const baseUnits = UnitCalculator.calcUnitsIfRedeveloped(baseParcel)
    const higherUnits = UnitCalculator.calcUnitsIfRedeveloped(higherEnvelope)

    expect(higherUnits).toBeGreaterThan(baseUnits)
  })

  it('historic parcels have lower redevelopment probability', () => {
    const nonHistoric = parcels.find(p => p.Historic === 0 && p.Height_Ft > 40)
    const historicVersion = { ...nonHistoric, Historic: 1 }

    const probNonHistoric = UnitCalculator.calc20YearProbability(nonHistoric, 'low')
    const probHistoric = UnitCalculator.calc20YearProbability(historicVersion, 'low')

    expect(probHistoric).toBeLessThan(probNonHistoric)
  })

  it('SDB parcels produce more units', () => {
    const parcel = parcels.find(p => p.Env_1000_Area_Height > 20)
    const withSDB = { ...parcel, SDB_2016_5Plus: 1, SDB_2016_5Plus_EnvFull: parcel.Env_1000_Area_Height }
    const withoutSDB = { ...parcel, SDB_2016_5Plus: 0, SDB_2016_5Plus_EnvFull: 0 }

    const unitsWithSDB = UnitCalculator.calcUnitsIfRedeveloped(withSDB)
    const unitsWithoutSDB = UnitCalculator.calcUnitsIfRedeveloped(withoutSDB)

    expect(unitsWithSDB).toBeGreaterThan(unitsWithoutSDB)
  })

  it('high scenario produces more expected units than low', () => {
    const parcel = parcels.find(p => p.Env_1000_Area_Height > 10)

    const lowUnits = UnitCalculator.calcExpectedUnits(parcel, 'low')
    const highUnits = UnitCalculator.calcExpectedUnits(parcel, 'high')

    expect(highUnits).toBeGreaterThanOrEqual(lowUnits)
  })
})
