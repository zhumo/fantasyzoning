import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { PlanCalculator } from '../src/planCalculator.js'
import { parseNumericCSV, parseCSV } from '../src/helpers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadMergedParcels() {
  const modelPath = join(__dirname, '../public/data/parcels-model.csv')
  const overlayPath = join(__dirname, '../public/data/parcels-overlay.csv')

  const modelContent = readFileSync(modelPath, 'utf-8')
  const overlayContent = readFileSync(overlayPath, 'utf-8')

  const modelRows = parseNumericCSV(modelContent)
  const overlayData = parseCSV(overlayContent)

  const overlayMap = new Map()
  overlayData.forEach(row => overlayMap.set(row.mapblklot, row))

  return modelRows.map(row => {
    const overlay = overlayMap.get(row.BlockLot) || {}
    return { ...row, ...overlay }
  })
}

const parcel = {
  BlockLot: '1',
  Height_Ft: 65,
  Area_1000: 5,
  fzp_expected_units_low: 10,
  fzp_expected_units_high: 20,
  Zoning_DR_EnvFull: 0,
  analysis_neighborhood: 'Mission',
  zoning_code: 'RH-2',
  distance_to_transit: '400'
}
const parcels = [parcel]

describe('PlanCalculator.ruleMatchesParcel', () => {
  const calc = new PlanCalculator(parcels)

  it('matches when rule has no criteria', () => {
    const rule = { proposedHeight: 85 }
    expect(calc.ruleMatchesParcel(rule, parcel)).toBe(true)
  })

  it('matches on neighborhood', () => {
    const rule = { neighborhood: 'Mission' }
    expect(calc.ruleMatchesParcel(rule, parcel)).toBe(true)
    expect(calc.ruleMatchesParcel(rule, { ...parcel, analysis_neighborhood: 'SOMA' })).toBe(false)
  })

  it('matches on zoning code in pipe-separated list', () => {
    const rule = { zoningCode: 'RH-2' }
    expect(calc.ruleMatchesParcel(rule, { ...parcel, zoning_code: 'RH-1|RH-2|RH-3' })).toBe(true)
    expect(calc.ruleMatchesParcel(rule, { ...parcel, zoning_code: 'RM-1|RM-2' })).toBe(false)
  })

  it('matches on FZP height', () => {
    const rule = { fzpHeight: '65' }
    expect(calc.ruleMatchesParcel(rule, { ...parcel, Height_Ft: '65' })).toBe(true)
    expect(calc.ruleMatchesParcel(rule, { ...parcel, Height_Ft: '85' })).toBe(false)
  })

  it('matches on transit distance', () => {
    const rule = { transitDistance: 500 }
    expect(calc.ruleMatchesParcel(rule, parcel)).toBe(true)
    expect(calc.ruleMatchesParcel(rule, { ...parcel, distance_to_transit: '600' })).toBe(false)
  })

  it('requires ALL criteria to match (AND logic)', () => {
    const rule = { neighborhood: 'Mission', zoningCode: 'RH-2' }
    expect(calc.ruleMatchesParcel(rule, parcel)).toBe(true)
    expect(calc.ruleMatchesParcel(rule, { ...parcel, analysis_neighborhood: 'SOMA' })).toBe(false)
  })
})

describe('PlanCalculator.getProposedHeight', () => {
  const calc = new PlanCalculator(parcels)

  it('returns null when no rules', () => {
    expect(calc.getProposedHeight([], parcel)).toBe(null)
  })

  it('returns null when no rules match', () => {
    const rules = [{ proposedHeight: 85, neighborhood: 'SOMA' }]
    expect(calc.getProposedHeight(rules, parcel)).toBe(null)
  })

  it('returns height when single rule matches', () => {
    const rules = [{ proposedHeight: 85, neighborhood: 'Mission' }]
    expect(calc.getProposedHeight(rules, parcel)).toBe(85)
  })

  it('returns max height when multiple rules match (tallest height wins)', () => {
    const rules = [
      { proposedHeight: 65 },
      { proposedHeight: 85 },
      { proposedHeight: 45 }
    ]
    expect(calc.getProposedHeight(rules, parcel)).toBe(85)
  })

  it('only considers matching rules for max height', () => {
    const rules = [
      { proposedHeight: 100, neighborhood: 'SOMA' },
      { proposedHeight: 65, neighborhood: 'Mission' },
      { proposedHeight: 45 }
    ]
    expect(calc.getProposedHeight(rules, parcel)).toBe(65)
  })
})

describe('PlanCalculator.calculate', () => {
  it('returns zero totals for empty parcels array', () => {
    const calc = new PlanCalculator([])
    const result = calc.calculate([])
    expect(result.totals.low).toBe(0)
    expect(result.totals.high).toBe(0)
    expect(result.parcelResults.size).toBe(0)
  })

  it('uses FZP baseline when no rules provided', () => {
    const parcels = [
      { BlockLot: '1', Height_Ft: 65, Area_1000: 5, fzp_expected_units_low: 10, fzp_expected_units_high: 20, Zoning_DR_EnvFull: 0 },
      { BlockLot: '2', Height_Ft: 85, Area_1000: 3, fzp_expected_units_low: 15, fzp_expected_units_high: 25, Zoning_DR_EnvFull: 0 }
    ]
    const calc = new PlanCalculator(parcels)
    const result = calc.calculate([])
    expect(result.totals.low).toBe(25)
    expect(result.totals.high).toBe(45)
  })

  it('applies single rule correctly', () => {
    const parcels = [
      { BlockLot: '1', Height_Ft: 65, Area_1000: 5, fzp_expected_units_low: 10, fzp_expected_units_high: 20, analysis_neighborhood: 'Mission', Zoning_DR_EnvFull: 0 },
      { BlockLot: '2', Height_Ft: 65, Area_1000: 3, fzp_expected_units_low: 15, fzp_expected_units_high: 25, analysis_neighborhood: 'SOMA', Zoning_DR_EnvFull: 0 }
    ]
    const calc = new PlanCalculator(parcels)

    const ruleResult = calc.calculate([{ proposedHeight: 85, neighborhood: 'Mission' }])

    expect(ruleResult.parcelResults.get('1').effectiveHeight).toBe(85)
    expect(ruleResult.parcelResults.get('2').effectiveHeight).toBe(65)
  })

  it('only upzones when proposedHeight > FZP height', () => {
    const parcels = [
      { BlockLot: '1', Height_Ft: 85, Area_1000: 5, fzp_expected_units_low: 10, fzp_expected_units_high: 20, Zoning_DR_EnvFull: 0 }
    ]
    const calc = new PlanCalculator(parcels)

    const result = calc.calculate([{ proposedHeight: 65 }])
    expect(result.parcelResults.get('1').effectiveHeight).toBe(85)
    expect(result.totals.low).toBe(10)
    expect(result.totals.high).toBe(20)
  })

  it('parcelResults contains expected fields', () => {
    const parcels = [
      { BlockLot: '1', Height_Ft: 65, Area_1000: 5, fzp_expected_units_low: 10, fzp_expected_units_high: 20, Zoning_DR_EnvFull: 0 }
    ]
    const calc = new PlanCalculator(parcels)
    const result = calc.calculate([])
    const parcelResult = result.parcelResults.get('1')

    expect(parcelResult).toHaveProperty('effectiveHeight')
    expect(parcelResult).toHaveProperty('expectedUnitsLow')
    expect(parcelResult).toHaveProperty('expectedUnitsHigh')
    expect(parcelResult).toHaveProperty('probabilityLow')
    expect(parcelResult).toHaveProperty('probabilityHigh')
    expect(parcelResult).toHaveProperty('unitsIfRedeveloped')
  })
})

describe('PlanCalculator with real data', () => {
  const parcels = loadMergedParcels()
  const calc = new PlanCalculator(parcels)

  it('FZP baseline totals match CSV pre-computed values', () => {
    const result = calc.calculate([])
    expect(result.totals.low).toBe(29148)
    expect(result.totals.high).toBe(48192)
  }, 60000)

  it('targeted rule only affects matching parcels', () => {
    const baseline = calc.calculate([])
    const targeted = calc.calculate([{ proposedHeight: 200, neighborhood: 'Mission' }])

    const missionParcels = parcels.filter(p => p.analysis_neighborhood === 'Mission')
    const nonMissionCount = parcels.length - missionParcels.length

    let unchangedCount = 0
    for (const p of parcels) {
      if (p.analysis_neighborhood !== 'Mission') {
        const baselineResult = baseline.parcelResults.get(p.BlockLot)
        const targetedResult = targeted.parcelResults.get(p.BlockLot)
        if (baselineResult.effectiveHeight === targetedResult.effectiveHeight) {
          unchangedCount++
        }
      }
    }

    expect(unchangedCount).toBe(nonMissionCount)
  }, 120000)
})
