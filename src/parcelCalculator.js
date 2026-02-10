import macroScenariosCSV from './data/macro-scenarios.csv?raw'
import PROB_REG_WEIGHTS from './data/prob-reg-weights.json'
import UNITS_REG_WEIGHTS from './data/units-reg-weights.json'

const SDB_ENVELOPE_THRESHOLD = 9.0
const SDB_HEIGHT_CAP = 130

const MACRO_FIELDS = ['Intercept', 'Const_Costs_Real', 'Zillow_Price_Real']

function parseMacroScenariosCSV(csv) {
  const lines = csv.trim().split('\n')
  const scenarios = {}
  for (let i = 1; i < lines.length; i++) {
    const [year, costs, priceLow, priceHigh] = lines[i].split(',')
    const yearNum = parseInt(year)
    if (yearNum >= 2026 && yearNum <= 2045) {
      scenarios[yearNum] = {
        construction_costs: parseFloat(costs),
        zillow_re_prices: { low: parseFloat(priceLow), high: parseFloat(priceHigh) }
      }
    }
  }
  return scenarios
}

export const MACRO_SCENARIOS = parseMacroScenariosCSV(macroScenariosCSV)

export class ParcelCalculator {
  constructor(parcel) {
    this.prepared = ParcelCalculator.prepareParcel(parcel)
  }

  static computeEnvelope(parcel) {
    return parcel.Area_1000 * parcel.Height_Ft / 10
  }

  static computeSdbQualification(parcel) {
    const envelope = ParcelCalculator.computeEnvelope(parcel)
    return envelope > SDB_ENVELOPE_THRESHOLD && parcel.Height_Ft <= SDB_HEIGHT_CAP
  }

  static prepareParcel(parcel) {
    const envelope = ParcelCalculator.computeEnvelope(parcel)
    const sdb = ParcelCalculator.computeSdbQualification(parcel)

    return {
      ...parcel,
      Env_1000_Area_Height: envelope,
      SDB_2016_5Plus: sdb,
      SDB_2016_5Plus_EnvFull: sdb * envelope
    }
  }

  static sigmoid(z) {
    return 1 / (1 + Math.exp(-z))
  }

  calcAnnualProbability(year, scenario) {
    let z = PROB_REG_WEIGHTS.Intercept
    z += PROB_REG_WEIGHTS.Const_Costs_Real * constructionCosts[year]
    z += PROB_REG_WEIGHTS.Zillow_Price_Real * zillowRePrices[year][scenario]

    for (const field of Object.keys(PROB_REG_WEIGHTS)) {
      if (MACRO_FIELDS.includes(field)) continue
      if (this.prepared[field] === undefined) return null
      z += PROB_REG_WEIGHTS[field] * this.prepared[field]
    }

    return ParcelCalculator.sigmoid(z)
  }

  calc20YearProbability(scenario) {
    let probNotDeveloped = 1.0
    for (const year in constructionCosts) {
      const annualProb = this.calcAnnualProbability(year, scenario)
      if (annualProb === null) return null
      probNotDeveloped *= (1 - annualProb)
    }
    return 1 - probNotDeveloped
  }

  calcUnitsIfRedeveloped() {
    for (const field of Object.keys(UNITS_REG_WEIGHTS)) {
      if (field === 'Intercept') continue
      if (this.prepared[field] === undefined) return null
    }
    let units = UNITS_REG_WEIGHTS.Intercept
    units += UNITS_REG_WEIGHTS.Env_1000_Area_Height * this.prepared.Env_1000_Area_Height
    units += UNITS_REG_WEIGHTS.SDB_2016_5Plus_EnvFull * this.prepared.SDB_2016_5Plus_EnvFull
    units += UNITS_REG_WEIGHTS.Zoning_DR_EnvFull * this.prepared.Zoning_DR_EnvFull
    return Math.max(0, units)
  }

  getProbabilityLow() {
    return this.calc20YearProbability('low')
  }

  getProbabilityHigh() {
    return this.calc20YearProbability('high')
  }

  getUnitsIfRedeveloped() {
    return this.calcUnitsIfRedeveloped()
  }

  getExpectedUnitsLow() {
    const prob = this.getProbabilityLow()
    const units = this.getUnitsIfRedeveloped()
    if (prob === null || units === null) return null
    return prob * units
  }

  getExpectedUnitsHigh() {
    const prob = this.getProbabilityHigh()
    const units = this.getUnitsIfRedeveloped()
    if (prob === null || units === null) return null
    return prob * units
  }
}
