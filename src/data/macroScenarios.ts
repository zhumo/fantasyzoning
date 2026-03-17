import Papa from 'papaparse'
import macroScenariosCSV from './macro-scenarios.csv?raw'

interface MacroScenario {
  construction_costs: number
  zillow_re_prices: {
    low: number
    high: number
  }
}

export type MacroScenarios = Record<number, MacroScenario>

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
    // The City Economist's data originally came with 2000-2045 data.
    // Since we're projecting into the future, we only want to provide the future macro
    .filter(row => row['Model Year'] >= 2026 && row['Model Year'] <= 2045)
    .map(row => [row['Model Year'], {
      construction_costs: row['Construc_Costs_Real'],
      zillow_re_prices: { low: row['Price-Low Growth'], high: row['Price-High Growth'] }
    }])
)
