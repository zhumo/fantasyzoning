<script setup>
import { onMounted, ref, watch } from 'vue';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const mapContainer = ref(null);
const map = ref(null);
const currentIndex = ref(0);
const featureCount = ref(0);
const properties = ref([]);
const loading = ref(false);
const hoveredParcel = ref(null);
const hoveredFeature = ref(null);
const tooltipPosition = ref({ x: 0, y: 0 });

const datasets = [
  { file: 'parcels.geojson', attributesFile: 'parcels.csv', name: 'SF Parcels', color: '#066' },
];

const currentDataset = () => datasets[currentIndex.value];

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
}

async function loadDataset() {
  if (!map.value) return;

  loading.value = true;
  const dataset = currentDataset();

  if (map.value.getLayer('data-fill')) map.value.removeLayer('data-fill');
  if (map.value.getLayer('data-fill-pattern')) map.value.removeLayer('data-fill-pattern');
  if (map.value.getLayer('data-line')) map.value.removeLayer('data-line');
  if (map.value.getLayer('data-point')) map.value.removeLayer('data-point');
  if (map.value.getLayer('public-fill')) map.value.removeLayer('public-fill');
  if (map.value.getLayer('public-fill-pattern')) map.value.removeLayer('public-fill-pattern');
  if (map.value.getLayer('public-line')) map.value.removeLayer('public-line');
  if (map.value.getLayer('transit-bart')) map.value.removeLayer('transit-bart');
  if (map.value.getLayer('transit-caltrain')) map.value.removeLayer('transit-caltrain');
  if (map.value.getLayer('highlight-fill')) map.value.removeLayer('highlight-fill');
  if (map.value.getLayer('highlight-line')) map.value.removeLayer('highlight-line');
  if (map.value.getSource('data')) map.value.removeSource('data');
  if (map.value.getSource('public-data')) map.value.removeSource('public-data');
  if (map.value.getSource('transit-bart')) map.value.removeSource('transit-bart');
  if (map.value.getSource('transit-caltrain')) map.value.removeSource('transit-caltrain');
  if (map.value.getSource('highlight')) map.value.removeSource('highlight');

  const [geomResponse, attrResponse] = await Promise.all([
    fetch(`/data/${dataset.file}`),
    fetch(`/data/${dataset.attributesFile}`)
  ]);

  const geometries = await geomResponse.json();
  const attributesText = await attrResponse.text();
  const attributes = parseCSV(attributesText);

  const attributesMap = new Map();
  attributes.forEach(attr => {
    attributesMap.set(attr.mapblklot, attr);
  });

  geometries.features.forEach(feature => {
    const mapblklot = feature.properties.mapblklot;
    const attrs = attributesMap.get(mapblklot);
    if (attrs) {
      feature.properties = { ...feature.properties, ...attrs };
    }
  });

  const geojson = geometries;

  featureCount.value = geojson.features.length;

  const sampleFeature = geojson.features[0];
  if (sampleFeature && sampleFeature.properties) {
    properties.value = Object.entries(sampleFeature.properties).map(([key, value]) => ({
      key,
      type: typeof value,
      sample: String(value).slice(0, 50)
    }));
  } else {
    properties.value = [];
  }

  map.value.addSource('data', { type: 'geojson', data: geojson });

  const geomType = sampleFeature?.geometry?.type || 'Polygon';

  if (geomType.includes('Polygon')) {
    const size = 64;
    const stripePattern = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isStripe = (x + y) % 8 < 4;
        const pos = (y * size + x) * 4;
        if (isStripe) {
          stripePattern[pos] = 46;
          stripePattern[pos + 1] = 168;
          stripePattern[pos + 2] = 67;
          stripePattern[pos + 3] = 255;
        } else {
          stripePattern[pos] = 136;
          stripePattern[pos + 1] = 136;
          stripePattern[pos + 2] = 136;
          stripePattern[pos + 3] = 255;
        }
      }
    }

    map.value.addImage('stripe-pattern', {
      width: size,
      height: size,
      data: stripePattern
    });

    map.value.addLayer({
      id: 'data-fill',
      type: 'fill',
      source: 'data',
      paint: {
        'fill-color': '#888',
        'fill-opacity': 0.4
      }
    });

    map.value.addLayer({
      id: 'data-line',
      type: 'line',
      source: 'data',
      paint: { 'line-color': '#000', 'line-width': 0.5, 'line-opacity': 0.5 }
    });

    const publicResponse = await fetch('/data/public-parcels.geojson');
    const publicGeojson = await publicResponse.json();

    map.value.addSource('public-data', { type: 'geojson', data: publicGeojson });

    map.value.addLayer({
      id: 'public-fill',
      type: 'fill',
      source: 'public-data',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'zoning_district'], 'PUBLIC'],
          '#2ea843',
          '#888'
        ],
        'fill-opacity': 0.4
      }
    });

    map.value.addLayer({
      id: 'public-fill-pattern',
      type: 'fill',
      source: 'public-data',
      paint: {
        'fill-pattern': [
          'case',
          ['!=', ['get', 'zoning_district'], 'PUBLIC'],
          'stripe-pattern',
          ''
        ],
        'fill-opacity': 0.8
      }
    });

    map.value.addLayer({
      id: 'public-line',
      type: 'line',
      source: 'public-data',
      paint: { 'line-color': '#000', 'line-width': 0.5, 'line-opacity': 0.5 }
    });

    const bartResponse = await fetch('/data/transit-bart.geojson');
    const bartGeojson = await bartResponse.json();

    map.value.addSource('transit-bart', { type: 'geojson', data: bartGeojson });

    map.value.addLayer({
      id: 'transit-bart',
      type: 'circle',
      source: 'transit-bart',
      paint: {
        'circle-color': '#0066ff',
        'circle-radius': 6,
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2
      }
    });

    const caltrainResponse = await fetch('/data/transit-caltrain.geojson');
    const caltrainGeojson = await caltrainResponse.json();

    map.value.addSource('transit-caltrain', { type: 'geojson', data: caltrainGeojson });

    map.value.addLayer({
      id: 'transit-caltrain',
      type: 'circle',
      source: 'transit-caltrain',
      paint: {
        'circle-color': '#0066ff',
        'circle-radius': 6,
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2
      }
    });
  } else if (geomType.includes('Line')) {
    map.value.addLayer({
      id: 'data-line',
      type: 'line',
      source: 'data',
      paint: { 'line-color': dataset.color, 'line-width': 2 }
    });
  } else if (geomType.includes('Point')) {
    map.value.addLayer({
      id: 'data-point',
      type: 'circle',
      source: 'data',
      paint: { 'circle-color': dataset.color, 'circle-radius': 6, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 }
    });
  }

  map.value.addSource('highlight', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  if (geomType.includes('Polygon')) {
    map.value.addLayer({
      id: 'highlight-fill',
      type: 'fill',
      source: 'highlight',
      paint: { 'fill-color': '#f00', 'fill-opacity': 0.5 }
    });
    map.value.addLayer({
      id: 'highlight-line',
      type: 'line',
      source: 'highlight',
      paint: { 'line-color': '#f00', 'line-width': 2 }
    });
  }

  setupInteractions(geojson);
  loading.value = false;
}

function setupInteractions(geojson) {
  const layers = ['data-fill', 'public-fill'];

  const handleMouseMove = (e) => {
    if (e.features.length > 0) {
      const feature = e.features[0];
      map.value.getCanvas().style.cursor = 'pointer';
      hoveredParcel.value = feature.properties;
      hoveredFeature.value = feature;
      tooltipPosition.value = { x: e.point.x, y: e.point.y };

      map.value.getSource('highlight').setData({
        type: 'FeatureCollection',
        features: [feature]
      });
    }
  };

  const handleMouseLeave = () => {
    map.value.getCanvas().style.cursor = '';
    hoveredParcel.value = null;
    hoveredFeature.value = null;

    map.value.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: []
    });
  };

  layers.forEach(layerId => {
    map.value.on('mousemove', layerId, handleMouseMove);
    map.value.on('mouseleave', layerId, handleMouseLeave);
  });
}

function prev() {
  currentIndex.value = (currentIndex.value - 1 + datasets.length) % datasets.length;
}

function next() {
  currentIndex.value = (currentIndex.value + 1) % datasets.length;
}

function getParcelAddress(parcel) {
  if (parcel.from_address_num && parcel.street_name) {
    const num = parcel.from_address_num;
    const street = parcel.street_name;
    const type = parcel.street_type || '';
    return `${num} ${street} ${type}`.trim();
  }

  if (parcel.streetintersection) {
    return parcel.streetintersection;
  }

  if (parcel.street) {
    return parcel.street;
  }

  return parcel.mapblklot || 'Unknown Address';
}

watch(currentIndex, loadDataset);

onMounted(() => {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-122.4862, 37.7694],
    zoom: 12,
    minZoom: 12,
    maxZoom: 18,
    maxBounds: [[-122.48, 37.72], [-122.40, 37.80]]
  });

  map.value.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.value.on('load', loadDataset);
});
</script>

<template>
  <div class="container">
    <div class="sidebar">
    </div>
    <div ref="mapContainer" class="map-container">
      <div v-if="hoveredParcel" class="tooltip" :style="{ left: tooltipPosition.x + 15 + 'px', top: tooltipPosition.y + 15 + 'px' }">
        <table>
          <tbody>
            <tr v-if="hoveredParcel.from_address_num || hoveredParcel.street_name">
              <td class="key">Address</td>
              <td class="value">{{ getParcelAddress(hoveredParcel) }}</td>
            </tr>
            <tr v-if="hoveredParcel.analysis_neighborhood">
              <td class="key">Neighborhood</td>
              <td class="value">{{ hoveredParcel.analysis_neighborhood }}</td>
            </tr>
            <tr v-if="hoveredParcel.zoning_code">
              <td class="key">Zoning Code</td>
              <td class="value">{{ hoveredParcel.zoning_code }}</td>
            </tr>
            <tr v-if="hoveredParcel.zoning_district">
              <td class="key">Zoning District</td>
              <td class="value">{{ hoveredParcel.zoning_district }}</td>
            </tr>
            <tr>
              <td class="key">Supervisor</td>
              <td class="value">{{ hoveredParcel.supname }} (D{{ hoveredParcel.supervisor_district }})</td>
            </tr>
            <tr v-if="hoveredParcel.mapblklot">
              <td class="key">Parcel ID</td>
              <td class="value">{{ hoveredParcel.mapblklot }}</td>
            </tr>
            <tr v-if="hoveredParcel.blklots">
              <td class="key"># Units</td>
              <td class="value">{{ Array(hoveredParcel.blklots).length }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 320px;
  padding: 16px;
  background: #f5f5f5;
  overflow-y: auto;
  flex-shrink: 0;
  color: #333;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.controls button {
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  color: #333;
}

.controls button:hover {
  background: #eee;
}

.index {
  font-weight: bold;
}

.dropdown {
  width: 100%;
  padding: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #333;
  background: #fff;
}

.info h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.description {
  color: #666;
  margin: 0 0 8px 0;
  font-size: 14px;
}

.count {
  font-weight: bold;
  color: #333;
  margin: 0;
}

.properties {
  margin-top: 16px;
}

.properties h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.properties table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}

.properties th, .properties td {
  text-align: left;
  padding: 4px;
  border-bottom: 1px solid #ddd;
}

.properties .sample {
  color: #666;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-container {
  flex: 1;
  height: 100vh;
  position: relative;
}

.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 13px;
  pointer-events: none;
  z-index: 10;
  max-width: 300px;
}

.tooltip table {
  border-collapse: collapse;
}

.tooltip td {
  padding: 3px 6px;
}

.tooltip .key {
  font-weight: bold;
  color: #ccc;
  padding-right: 12px;
  white-space: nowrap;
}

.tooltip .value {
  color: #fff;
}
</style>
