import { UnitCalculator } from '../src/unitCalculator.js'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadCSV(path) {
  const content = readFileSync(path, 'utf-8')
  const records = parse(content, { columns: true, skip_empty_lines: true })
  return records.map(row => {
    const parsed = {}
    for (const [key, value] of Object.entries(row)) {
      parsed[key] = parseFloat(value) || 0
    }
    return parsed
  })
}

const currentZoning = loadCSV(join(__dirname, '../../data/current-zoning.csv'))
const fzpZoning = loadCSV(join(__dirname, '../../data/fzp-zoning.csv'))

console.log(`Loaded ${currentZoning.length} current zoning parcels`)
console.log(`Loaded ${fzpZoning.length} FZP zoning parcels`)

console.log('\n--- Expected Values ---')
console.log('Low Growth, Current: 1,594')
console.log('Low Growth, FZP: 10,098')
console.log('High Growth, Current: 3,199')
console.log('High Growth, FZP: 17,845')

console.log('\n--- Calculated Values ---')

const lowCurrent = UnitCalculator.calcTotalExpectedUnits(currentZoning, 'low')
console.log(`Low Growth, Current: ${Math.round(lowCurrent).toLocaleString()}`)

const lowFzp = UnitCalculator.calcTotalExpectedUnits(fzpZoning, 'low')
console.log(`Low Growth, FZP: ${Math.round(lowFzp).toLocaleString()}`)

const highCurrent = UnitCalculator.calcTotalExpectedUnits(currentZoning, 'high')
console.log(`High Growth, Current: ${Math.round(highCurrent).toLocaleString()}`)

const highFzp = UnitCalculator.calcTotalExpectedUnits(fzpZoning, 'high')
console.log(`High Growth, FZP: ${Math.round(highFzp).toLocaleString()}`)
