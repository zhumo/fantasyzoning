import { ref } from 'vue'
import { parseCSV } from '../utils/csv.js'
import { MODEL_NUMERIC_COLS } from '../constants/modelColumns.js'
import { DATASETS } from '../constants/datasets.js'

const fzpZoningData = ref([])
const allParcelsData = ref([])
const parcelAttributes = ref(new Map())
const loading = ref(false)
const featureCount = ref(0)
const properties = ref([])

async function loadParcelData(datasetIndex = 0) {
  loading.value = true
  const dataset = DATASETS[datasetIndex]

  const [geomResponse, overlayResponse, modelResponse] = await Promise.all([
    fetch(`/data/${dataset.file}`),
    fetch(`/data/${dataset.overlayFile}`),
    fetch(`/data/${dataset.modelFile}`)
  ])

  const geometries = await geomResponse.json()
  const overlayText = await overlayResponse.text()
  const overlayData = parseCSV(overlayText)
  const modelText = await modelResponse.text()
  const modelRows = parseCSV(modelText)

  const parsedModelData = modelRows.map(row => {
    const parcel = { BlockLot: row.BlockLot, unitsCache: {} }
    MODEL_NUMERIC_COLS.forEach(col => {
      parcel[col] = parseFloat(row[col]) || 0
    })
    return parcel
  })
  fzpZoningData.value = parsedModelData

  const modelLookup = new Map()
  parsedModelData.forEach(p => modelLookup.set(p.BlockLot, p))

  const overlayMap = new Map()
  overlayData.forEach(row => {
    overlayMap.set(row.mapblklot, row)
  })
  parcelAttributes.value = overlayMap
  allParcelsData.value = parsedModelData

  geometries.features.forEach(feature => {
    const mapblklot = feature.properties.mapblklot
    const overlay = overlayMap.get(mapblklot)
    const model = modelLookup.get(mapblklot)

    if (overlay) {
      feature.properties = { ...feature.properties, ...overlay }
    }
    feature.properties.effective_height = parseFloat(feature.properties.Height_Ft) || (model ? model.Height_Ft : 0) || 0
  })

  featureCount.value = geometries.features.length

  const sampleFeature = geometries.features[0]
  if (sampleFeature && sampleFeature.properties) {
    properties.value = Object.entries(sampleFeature.properties).map(([key, value]) => ({
      key,
      type: typeof value,
      sample: String(value).slice(0, 50)
    }))
  } else {
    properties.value = []
  }

  loading.value = false

  return { geometries, modelLookup }
}

async function loadTransitData() {
  const [bartResponse, muniResponse, caltrainResponse] = await Promise.all([
    fetch('/data/transit-bart.geojson'),
    fetch('/data/transit-muni.geojson'),
    fetch('/data/transit-caltrain.geojson')
  ])

  const [bart, muni, caltrain] = await Promise.all([
    bartResponse.json(),
    muniResponse.json(),
    caltrainResponse.json()
  ])

  return { bart, muni, caltrain }
}

async function loadPublicParcels() {
  const response = await fetch('/data/public-parcels.geojson')
  return response.json()
}

export const parcelData = {
  fzpZoningData,
  allParcelsData,
  parcelAttributes,
  loading,
  featureCount,
  properties,
  loadParcelData,
  loadTransitData,
  loadPublicParcels
}
