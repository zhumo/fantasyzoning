import { ref } from 'vue'
import mapboxgl from 'mapbox-gl'

export function useMapbox() {
  const map = ref(null)
  const mapContainer = ref(null)
  const mapRendering = ref(false)

  function initializeMap(container) {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    map.value = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-122.4862, 37.7694],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: [[-122.55, 37.65], [-122.28, 37.85]]
    })

    map.value.addControl(new mapboxgl.NavigationControl(), 'top-right')

    return map.value
  }

  function clearLayers() {
    if (!map.value) return

    const layersToRemove = ['data-fill', 'data-point', 'data-line', 'public-fill', 'highlight-fill', 'highlight-line']
    const sourcesToRemove = ['data', 'public-data', 'highlight']

    layersToRemove.forEach(id => {
      if (map.value.getLayer(id)) map.value.removeLayer(id)
    })

    sourcesToRemove.forEach(id => {
      if (map.value.getSource(id)) map.value.removeSource(id)
    })
  }

  function addParcelLayer(geojson, color) {
    map.value.addSource('data', { type: 'geojson', data: geojson })

    const sampleFeature = geojson.features[0]
    const geomType = sampleFeature?.geometry?.type || 'Polygon'

    if (geomType.includes('Polygon')) {
      map.value.addLayer({
        id: 'data-fill',
        type: 'fill',
        source: 'data',
        paint: {
          'fill-color': [
            'step',
            ['to-number', ['get', 'effective_height'], 0],
            '#f5f0e6',
            45, '#ffffcc',
            55, '#c7e9b4',
            65, '#7fcdbb',
            75, '#41b6c4',
            85, '#1d91c0',
            95, '#225ea8',
            105, '#253494',
            115, '#081d58',
            125, '#4a1486',
            135, '#7a0177',
            145, '#ae017e',
            150, '#dd3497'
          ],
          'fill-opacity': 1
        }
      })
    } else if (geomType.includes('Line')) {
      map.value.addLayer({
        id: 'data-line',
        type: 'line',
        source: 'data',
        paint: { 'line-color': color, 'line-width': 2 }
      })
    } else if (geomType.includes('Point')) {
      map.value.addLayer({
        id: 'data-point',
        type: 'circle',
        source: 'data',
        paint: { 'circle-color': color, 'circle-radius': 6, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 }
      })
    }

    return geomType
  }

  function addPublicParcelsLayer(geojson) {
    map.value.addSource('public-data', { type: 'geojson', data: geojson })

    map.value.addLayer({
      id: 'public-fill',
      type: 'fill',
      source: 'public-data',
      paint: {
        'fill-color': 'transparent',
        'fill-opacity': 0
      }
    })
  }

  function addHighlightLayer(geomType) {
    map.value.addSource('highlight', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    })

    if (geomType.includes('Polygon')) {
      map.value.addLayer({
        id: 'highlight-fill',
        type: 'fill',
        source: 'highlight',
        paint: { 'fill-color': '#f00', 'fill-opacity': 0.5 }
      })
      map.value.addLayer({
        id: 'highlight-line',
        type: 'line',
        source: 'highlight',
        paint: { 'line-color': '#f00', 'line-width': 2 }
      })
    }
  }

  function addTransitLayers(bart, muni, caltrain) {
    map.value.addSource('transit-bart', { type: 'geojson', data: bart })
    map.value.addSource('transit-muni', { type: 'geojson', data: muni })
    map.value.addSource('transit-caltrain', { type: 'geojson', data: caltrain })

    const transitStyle = {
      'circle-color': '#0066ff',
      'circle-radius': 6,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 2
    }

    map.value.addLayer({
      id: 'transit-bart-circles',
      type: 'circle',
      source: 'transit-bart',
      paint: transitStyle
    })

    map.value.addLayer({
      id: 'transit-muni-circles',
      type: 'circle',
      source: 'transit-muni',
      paint: transitStyle
    })

    map.value.addLayer({
      id: 'transit-caltrain-circles',
      type: 'circle',
      source: 'transit-caltrain',
      paint: transitStyle
    })
  }

  function updateMapColors(getProposedHeight, parcelAttributes) {
    if (!map.value || !map.value.getSource('data')) return

    const source = map.value.getSource('data')
    const geojson = source._data

    geojson.features.forEach(feature => {
      const attrs = feature.properties
      const proposedHeight = getProposedHeight(attrs)
      if (proposedHeight !== null) {
        feature.properties.effective_height = Math.max(
          proposedHeight,
          parseFloat(attrs.Height_Ft) || 0
        )
      } else {
        feature.properties.effective_height = parseFloat(attrs.Height_Ft) || 0
      }
    })

    source.setData(geojson)
  }

  function setHighlightFeature(feature) {
    if (!map.value || !map.value.getSource('highlight')) return

    map.value.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: feature ? [feature] : []
    })
  }

  function onMapIdle(callback) {
    if (!map.value) return
    map.value.once('idle', callback)
  }

  function onMapLoad(callback) {
    if (!map.value) return
    map.value.on('load', callback)
  }

  return {
    map,
    mapContainer,
    mapRendering,
    initializeMap,
    clearLayers,
    addParcelLayer,
    addPublicParcelsLayer,
    addHighlightLayer,
    addTransitLayers,
    updateMapColors,
    setHighlightFeature,
    onMapIdle,
    onMapLoad
  }
}
