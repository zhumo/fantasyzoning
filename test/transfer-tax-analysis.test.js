import { describe, it, expect, beforeAll } from 'vitest'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { runAnalysis } from '../analyses/transfer-tax-reform/calculate-expected-units.mjs'
import { parseNumericCSV } from '../src/helpers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

const FIXTURE_DIR = join(__dirname, 'fixtures')
const FIXTURE_PATH = join(FIXTURE_DIR, 'expected-values-sample.csv')
const FULL_DATA_PATH = join(projectRoot, 'sf_all_parcels_expected_values_v4.csv')

describe('Transfer tax analysis with fixture', () => {
  beforeAll(() => {
    if (!existsSync(FIXTURE_DIR)) {
      mkdirSync(FIXTURE_DIR, { recursive: true })
    }

    const modelPath = join(projectRoot, 'public/data/parcels-model.csv')
    const modelContent = readFileSync(modelPath, 'utf-8')
    const parcels = parseNumericCSV(modelContent)
    const sampleBlockLots = parcels.slice(0, 5).map(p => p.BlockLot)

    const fixtureLines = ['parcel_number,property_location,expected_value,value_source']
    const values = [500000, 1500000, 8000000, 15000000, 30000000]
    sampleBlockLots.forEach((bl, i) => {
      fixtureLines.push(`${bl}001,${100 * (i + 1)} MAIN ST,${values[i]},predicted`)
    })

    writeFileSync(FIXTURE_PATH, fixtureLines.join('\n'))
  })

  it('runAnalysis returns expected structure', { timeout: 60000 }, () => {
    const results = runAnalysis(FIXTURE_PATH)

    expect(results).toHaveProperty('original')
    expect(results).toHaveProperty('withReform')
    expect(results).toHaveProperty('difference')

    expect(results.original).toHaveProperty('low')
    expect(results.original).toHaveProperty('high')
    expect(results.withReform).toHaveProperty('low')
    expect(results.withReform).toHaveProperty('high')
    expect(results.difference).toHaveProperty('low')
    expect(results.difference).toHaveProperty('high')
    expect(results.difference).toHaveProperty('lowPct')
    expect(results.difference).toHaveProperty('highPct')
  })

  it('reform produces more units than original', { timeout: 60000 }, () => {
    const results = runAnalysis(FIXTURE_PATH)

    expect(results.withReform.low).toBeGreaterThanOrEqual(results.original.low)
    expect(results.withReform.high).toBeGreaterThanOrEqual(results.original.high)
    expect(results.difference.low).toBeGreaterThanOrEqual(0)
    expect(results.difference.high).toBeGreaterThanOrEqual(0)
  })
})

describe.skipIf(!existsSync(FULL_DATA_PATH))('Transfer tax analysis with full dataset', () => {
  it('produces expected results within tolerance', { timeout: 120000 }, () => {
    const results = runAnalysis(FULL_DATA_PATH)

    expect(results.original.low).toBeCloseTo(28834, -2)
    expect(results.original.high).toBeCloseTo(47558, -2)

    expect(results.withReform.low).toBeCloseTo(33050, -2)
    expect(results.withReform.high).toBeCloseTo(55178, -2)

    expect(results.difference.low).toBeCloseTo(4216, -2)
    expect(results.difference.high).toBeCloseTo(7620, -2)
  })
})
