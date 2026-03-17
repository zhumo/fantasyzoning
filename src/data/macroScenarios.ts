import Papa from 'papaparse'
import macroScenariosCSV from './macro-scenarios.csv?raw'

interface MacroScenarioData {
  construction_costs: number
  zillow_re_prices: {
    low: number
    high: number
  }
}

interface MacroRow {
  'Model Year': number
  'Construc_Costs_Real': number
  'Price-Low Growth': number
  'Price-High Growth': number
}

export class MacroScenarios {
  private data: Record<number, MacroScenarioData>

  private constructor(data: Record<number, MacroScenarioData>) {
    this.data = data
  }

  static load(): MacroScenarios {
    const parsed = Papa.parse<MacroRow>(macroScenariosCSV, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    }).data

    const data: Record<number, MacroScenarioData> = Object.fromEntries(
      parsed
        .filter(row => row['Model Year'] >= 2026 && row['Model Year'] <= 2045)
        .map(row => [row['Model Year'], {
          construction_costs: row['Construc_Costs_Real'],
          zillow_re_prices: { low: row['Price-Low Growth'], high: row['Price-High Growth'] }
        }])
    )

    return new MacroScenarios(data)
  }

  static readonly default = MacroScenarios.load()

  get(year: number): MacroScenarioData | undefined {
    return this.data[year]
  }

  years(): number[] {
    return Object.keys(this.data).map(Number)
  }

  withConstructionCost(cost: number): MacroScenarios {
    const modified: Record<number, MacroScenarioData> = {}
    for (const year of this.years()) {
      const scenario = this.data[year]!
      modified[year] = {
        ...scenario,
        construction_costs: cost
      }
    }
    return new MacroScenarios(modified)
  }
}
