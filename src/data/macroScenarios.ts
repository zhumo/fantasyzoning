import Papa from 'papaparse'
import type { MacroScenarios } from '../types/parcel'
import macroScenariosCSV from './macro-scenarios.csv?raw'

interface MacroRow {
  'Model Year': number
  'Construc_Costs_Real': number
  'Price-Low Growth': number
  'Price-High Growth': number
}

const parsed = Papa.parse<MacroRow>(macroScenariosCSV, {
  header: true,
  skipEmptyLines: true,
  dynamicTyping: true
}).data

export const MACRO_SCENARIOS: MacroScenarios = Object.fromEntries(
  parsed
    .filter(row => row['Model Year'] >= 2026 && row['Model Year'] <= 2045)
    .map(row => [row['Model Year'], {
      construction_costs: row['Construc_Costs_Real'],
      zillow_re_prices: { low: row['Price-Low Growth'], high: row['Price-High Growth'] }
    }])
)
