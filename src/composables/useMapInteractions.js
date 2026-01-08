import { ref, computed } from 'vue'
import { UnitCalculator } from '../unitCalculator.js'
import { computeSdbQualification } from './useRules.js'
import { mapbox } from './useMapbox.js'
import { parcelData } from './useParcelData.js'

const hoveredParcel = ref(null)
const hoveredFeature = ref(null)
const hoveredTransitStop = ref(null)
const tooltipPosition = ref({ x: 0, y: 0 })

const hoveredParcelStats = computed(() => {
  if (!hoveredParcel.value || parcelData.fzpZoningData.value.length === 0) return null

  const mapblklot = hoveredParcel.value.mapblklot
  const fzpParcel = parcelData.fzpZoningData.value.find(p => String(p.BlockLot) === mapblklot)
  if (!fzpParcel) return null

  const proposedHeight = parseFloat(hoveredParcel.value.effective_height) || parseFloat(hoveredParcel.value.Height_Ft) || 0

  const modifiedParcel = { ...fzpParcel }
  if (proposedHeight > fzpParcel.Height_Ft) {
    modifiedParcel.Height_Ft = proposedHeight
    modifiedParcel.Env_1000_Area_Height = fzpParcel.Area_1000 * proposedHeight / 10
    modifiedParcel.SDB_2016_5Plus = computeSdbQualification(modifiedParcel.Env_1000_Area_Height, proposedHeight)
    modifiedParcel.SDB_2016_5Plus_EnvFull = modifiedParcel.SDB_2016_5Plus * modifiedParcel.Env_1000_Area_Height
  }

  const probLow = UnitCalculator.calc20YearProbability(modifiedParcel, 'low')
  const probHigh = UnitCalculator.calc20YearProbability(modifiedParcel, 'high')
  const units = UnitCalculator.calcUnitsIfRedeveloped(modifiedParcel)

  return {
    probLow: (probLow * 100).toFixed(1),
    probHigh: (probHigh * 100).toFixed(1),
    units: units.toFixed(1)
  }
})

function setupParcelInteractions() {
  if (!mapbox.map.value) return

  const layers = ['data-fill', 'public-fill']

  const handleMouseMove = (e) => {
    if (e.features.length > 0) {
      const feature = e.features[0]
      mapbox.map.value.getCanvas().style.cursor = 'pointer'
      hoveredParcel.value = feature.properties
      hoveredFeature.value = feature
      tooltipPosition.value = { x: e.point.x, y: e.point.y }
      mapbox.setHighlightFeature(feature)
    }
  }

  const handleMouseLeave = () => {
    mapbox.map.value.getCanvas().style.cursor = ''
    hoveredParcel.value = null
    hoveredFeature.value = null
    mapbox.setHighlightFeature(null)
  }

  layers.forEach(layerId => {
    mapbox.map.value.on('mousemove', layerId, handleMouseMove)
    mapbox.map.value.on('mouseleave', layerId, handleMouseLeave)
  })
}

function setupTransitInteractions() {
  if (!mapbox.map.value) return

  const transitLayers = [
    { id: 'transit-bart-circles', system: 'BART' },
    { id: 'transit-muni-circles', system: 'Muni' },
    { id: 'transit-caltrain-circles', system: 'Caltrain' }
  ]

  transitLayers.forEach(({ id, system }) => {
    mapbox.map.value.on('mouseenter', id, (e) => {
      mapbox.map.value.getCanvas().style.cursor = 'pointer'
      if (e.features.length > 0) {
        const props = e.features[0].properties
        let name = props.Name || props.stop_name || 'Unknown'
        let route = system
        if (system === 'Muni' && props.routes) {
          route = `Muni ${props.routes}`
        }
        hoveredTransitStop.value = { name, route }
        tooltipPosition.value = { x: e.point.x, y: e.point.y }
      }
    })

    mapbox.map.value.on('mousemove', id, (e) => {
      tooltipPosition.value = { x: e.point.x, y: e.point.y }
    })

    mapbox.map.value.on('mouseleave', id, () => {
      mapbox.map.value.getCanvas().style.cursor = ''
      hoveredTransitStop.value = null
    })
  })
}

export const mapInteractions = {
  hoveredParcel,
  hoveredFeature,
  hoveredTransitStop,
  tooltipPosition,
  hoveredParcelStats,
  setupParcelInteractions,
  setupTransitInteractions
}
