import { ref, computed } from 'vue'
import { UnitCalculator } from '../unitCalculator.js'
import { computeSdbQualification } from './useRules.js'

export function useMapInteractions(map, fzpZoningData, setHighlightFeature) {
  const hoveredParcel = ref(null)
  const hoveredFeature = ref(null)
  const hoveredTransitStop = ref(null)
  const tooltipPosition = ref({ x: 0, y: 0 })

  const hoveredParcelStats = computed(() => {
    if (!hoveredParcel.value || fzpZoningData.value.length === 0) return null

    const mapblklot = hoveredParcel.value.mapblklot
    const fzpParcel = fzpZoningData.value.find(p => String(p.BlockLot) === mapblklot)
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
    if (!map.value) return

    const layers = ['data-fill', 'public-fill']

    const handleMouseMove = (e) => {
      if (e.features.length > 0) {
        const feature = e.features[0]
        map.value.getCanvas().style.cursor = 'pointer'
        hoveredParcel.value = feature.properties
        hoveredFeature.value = feature
        tooltipPosition.value = { x: e.point.x, y: e.point.y }
        setHighlightFeature(feature)
      }
    }

    const handleMouseLeave = () => {
      map.value.getCanvas().style.cursor = ''
      hoveredParcel.value = null
      hoveredFeature.value = null
      setHighlightFeature(null)
    }

    layers.forEach(layerId => {
      map.value.on('mousemove', layerId, handleMouseMove)
      map.value.on('mouseleave', layerId, handleMouseLeave)
    })
  }

  function setupTransitInteractions() {
    if (!map.value) return

    const transitLayers = [
      { id: 'transit-bart-circles', system: 'BART' },
      { id: 'transit-muni-circles', system: 'Muni' },
      { id: 'transit-caltrain-circles', system: 'Caltrain' }
    ]

    transitLayers.forEach(({ id, system }) => {
      map.value.on('mouseenter', id, (e) => {
        map.value.getCanvas().style.cursor = 'pointer'
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

      map.value.on('mousemove', id, (e) => {
        tooltipPosition.value = { x: e.point.x, y: e.point.y }
      })

      map.value.on('mouseleave', id, () => {
        map.value.getCanvas().style.cursor = ''
        hoveredTransitStop.value = null
      })
    })
  }

  return {
    hoveredParcel,
    hoveredFeature,
    hoveredTransitStop,
    tooltipPosition,
    hoveredParcelStats,
    setupParcelInteractions,
    setupTransitInteractions
  }
}
