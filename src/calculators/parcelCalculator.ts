import type { ParcelModel, PreparedParcel, MacroScenarios, Scenario } from '../types/parcel'
import { MACRO_SCENARIOS } from '../data/macroScenarios'
import PROB_REG_WEIGHTS from '../data/prob-reg-weights.json'
import UNITS_REG_WEIGHTS from '../data/units-reg-weights.json'

const SDB_ENVELOPE_THRESHOLD = 9.0
const SDB_HEIGHT_CAP = 130

const MACRO_FIELDS = ['Intercept', 'Const_Costs_Real', 'Zillow_Price_Real'] as const

type ProbWeightKey = keyof typeof PROB_REG_WEIGHTS

export class ParcelCalculator {
  prepared: PreparedParcel
  macroScenarios: MacroScenarios

  constructor(parcel: ParcelModel, macroScenarios: MacroScenarios = MACRO_SCENARIOS) {
    this.prepared = ParcelCalculator.prepareParcel(parcel)
    this.macroScenarios = macroScenarios
  }

  static computeEnvelope(parcel: ParcelModel): number {
    return parcel.Area_1000 * parcel.Height_Ft / 10
  }

  static computeSdbQualification(parcel: ParcelModel): boolean {
    const envelope = ParcelCalculator.computeEnvelope(parcel)
    return envelope > SDB_ENVELOPE_THRESHOLD && parcel.Height_Ft <= SDB_HEIGHT_CAP
  }

  static prepareParcel(parcel: ParcelModel): PreparedParcel {
    const envelope = ParcelCalculator.computeEnvelope(parcel)
    const sdb = ParcelCalculator.computeSdbQualification(parcel)

    return {
      ...parcel,
      Env_1000_Area_Height: envelope,
      SDB_2016_5Plus: sdb,
      SDB_2016_5Plus_EnvFull: (sdb ? 1 : 0) * envelope
    }
  }

  static sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z))
  }

  calcAnnualProbability(year: number, scenario: Scenario): number | null {
    const macro = this.macroScenarios[year]
    if (!macro) return null

    let z = PROB_REG_WEIGHTS.Intercept
    z += PROB_REG_WEIGHTS.Const_Costs_Real * macro.construction_costs
    z += PROB_REG_WEIGHTS.Zillow_Price_Real * macro.zillow_re_prices[scenario]

    for (const field of Object.keys(PROB_REG_WEIGHTS) as ProbWeightKey[]) {
      if ((MACRO_FIELDS as readonly string[]).includes(field)) continue
      const value = this.prepared[field as keyof PreparedParcel]
      if (value === undefined) return null
      z += PROB_REG_WEIGHTS[field] * (typeof value === 'boolean' ? (value ? 1 : 0) : value as number)
    }

    return ParcelCalculator.sigmoid(z)
  }

  calc20YearProbability(scenario: Scenario): number | null {
    let probNotDeveloped = 1.0
    for (const yearStr in this.macroScenarios) {
      const year = Number(yearStr)
      const annualProb = this.calcAnnualProbability(year, scenario)
      if (annualProb === null) return null
      probNotDeveloped *= (1 - annualProb)
    }
    return 1 - probNotDeveloped
  }

  calcUnitsIfRedeveloped(): number | null {
    for (const field of Object.keys(UNITS_REG_WEIGHTS)) {
      if (field === 'Intercept') continue
      if (this.prepared[field as keyof PreparedParcel] === undefined) return null
    }
    let units = UNITS_REG_WEIGHTS.Intercept
    units += UNITS_REG_WEIGHTS.Env_1000_Area_Height * this.prepared.Env_1000_Area_Height
    units += UNITS_REG_WEIGHTS.SDB_2016_5Plus_EnvFull * this.prepared.SDB_2016_5Plus_EnvFull
    units += UNITS_REG_WEIGHTS.Zoning_DR_EnvFull * this.prepared.Zoning_DR_EnvFull
    return Math.max(0, units)
  }

  getProbabilityLow(): number | null {
    return this.calc20YearProbability('low')
  }

  getProbabilityHigh(): number | null {
    return this.calc20YearProbability('high')
  }

  getUnitsIfRedeveloped(): number | null {
    return this.calcUnitsIfRedeveloped()
  }

  getExpectedUnitsLow(): number | null {
    const prob = this.getProbabilityLow()
    const units = this.getUnitsIfRedeveloped()
    if (prob === null || units === null) return null
    return prob * units
  }

  getExpectedUnitsHigh(): number | null {
    const prob = this.getProbabilityHigh()
    const units = this.getUnitsIfRedeveloped()
    if (prob === null || units === null) return null
    return prob * units
  }
}
