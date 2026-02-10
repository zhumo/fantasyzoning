import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../../public/data')

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

function parseCSV(text) {
  const lines = text.split('\n')
  const headers = parseCSVLine(lines[0])
  const data = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }

  return data
}

const MODEL_NUMERIC_COLS = [
  'Height_Ft', 'Area_1000', 'Env_1000_Area_Height', 'Bldg_SqFt_1000',
  'Res_Dummy', 'Historic', 'SDB_2016_5Plus',
  'zp_OfficeComm', 'zp_DRMulti_RTO', 'zp_FBDMulti_RTO', 'zp_PDRInd',
  'zp_Public', 'zp_Redev', 'zp_RH2', 'zp_RH3_RM1',
  'DIST_SBayshore', 'DIST_BernalHts', 'DIST_Scentral', 'DIST_Central',
  'DIST_BuenaVista', 'DIST_Northeast', 'DIST_WestAddition', 'DIST_SOMA',
  'DIST_InnerSunset', 'DIST_Richmond', 'DIST_Ingleside', 'DIST_OuterSunset',
  'DIST_Marina', 'DIST_Mission', 'SDB_2016_5Plus_EnvFull', 'Zoning_DR_EnvFull',
  'fzp_expected_units_low', 'fzp_expected_units_high'
]

export function loadModelData() {
  const modelPath = path.join(DATA_DIR, 'parcels-model.csv')
  const modelText = fs.readFileSync(modelPath, 'utf-8')
  const modelRows = parseCSV(modelText)

  return modelRows.map(row => {
    const parcel = { BlockLot: row.BlockLot, unitsCache: {} }
    MODEL_NUMERIC_COLS.forEach(col => {
      parcel[col] = parseFloat(row[col]) || 0
    })
    return parcel
  })
}

export function loadOverlayData() {
  const overlayPath = path.join(DATA_DIR, 'parcels-overlay.csv')
  const overlayText = fs.readFileSync(overlayPath, 'utf-8')
  const overlayData = parseCSV(overlayText)

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
