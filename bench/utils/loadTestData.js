import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Papa from 'papaparse'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../../public/data')

export function loadModelData() {
  const modelPath = path.join(DATA_DIR, 'parcels-model.csv')
  const modelText = fs.readFileSync(modelPath, 'utf-8')
  const rows = Papa.parse(modelText, { header: true, skipEmptyLines: true, dynamicTyping: true }).data
  return rows.map(row => ({ ...row, unitsCache: {} }))
}

export function loadOverlayData() {
  const overlayPath = path.join(DATA_DIR, 'parcels-overlay.csv')
  const overlayText = fs.readFileSync(overlayPath, 'utf-8')
  const overlayData = Papa.parse(overlayText, { header: true, skipEmptyLines: true }).data

  const overlayMap = new Map()
  overlayData.forEach(row => {
    overlayMap.set(row.mapblklot, row)
  })

  return overlayMap
}

export function loadTestData() {
  return {
    parcels: loadModelData(),
    attributes: loadOverlayData()
  }
}
