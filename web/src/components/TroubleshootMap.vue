<script setup>
import { onMounted, ref } from 'vue';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const mapContainer = ref(null);
const map = ref(null);
const loading = ref(true);
const missingCount = ref(0);
const hoveredParcel = ref(null);
const tooltipPosition = ref({ x: 0, y: 0 });

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

async function loadData() {
  const [geomResponse, fzpResponse] = await Promise.all([
    fetch('/data/parcels.geojson'),
    fetch('/data/fzp-zoning.csv')
  ]);

  const geometries = await geomResponse.json();
  const fzpText = await fzpResponse.text();
  const fzpData = parseCSV(fzpText);

  const missingBlockLots = new Set();
  fzpData.forEach(row => {
    const bldgSqFt = row.Bldg_SqFt_1000;
    if (bldgSqFt === '' || bldgSqFt === 'nan' || bldgSqFt === undefined || bldgSqFt === null) {
      missingBlockLots.add(row.BlockLot);
    }
  });

  missingCount.value = missingBlockLots.size;

  const missingFeatures = geometries.features.filter(feature => {
    return missingBlockLots.has(feature.properties.mapblklot);
  });

  return {
    type: 'FeatureCollection',
    features: missingFeatures
  };
}

onMounted(async () => {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  map.value = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/light-v11',
    center: [-122.4194, 37.7749],
    zoom: 12,
    minZoom: 10,
    maxZoom: 18,
    maxBounds: [[-122.55, 37.65], [-122.28, 37.85]]
  });

  map.value.addControl(new mapboxgl.NavigationControl(), 'top-right');

  map.value.on('load', async () => {
    const missingData = await loadData();

    map.value.addSource('missing-parcels', {
      type: 'geojson',
      data: missingData
    });

    map.value.addLayer({
      id: 'missing-fill',
      type: 'fill',
      source: 'missing-parcels',
      paint: {
        'fill-color': '#ff0000',
        'fill-opacity': 0.7
      }
    });

    map.value.addLayer({
      id: 'missing-outline',
      type: 'line',
      source: 'missing-parcels',
      paint: {
        'line-color': '#cc0000',
        'line-width': 1
      }
    });

    map.value.on('mousemove', 'missing-fill', (e) => {
      if (e.features.length > 0) {
        map.value.getCanvas().style.cursor = 'pointer';
        hoveredParcel.value = e.features[0].properties;
        tooltipPosition.value = { x: e.point.x, y: e.point.y };
      }
    });

    map.value.on('mouseleave', 'missing-fill', () => {
      map.value.getCanvas().style.cursor = '';
      hoveredParcel.value = null;
    });

    loading.value = false;
  });
});
</script>

<template>
  <div class="container">
    <div class="sidebar">
      <h1>Troubleshoot: Missing Bldg_SqFt</h1>
      <p>This map shows parcels from fzp-zoning.csv that are missing the Bldg_SqFt_1000 attribute.</p>
      <div class="stats">
        <div class="stat">
          <span class="stat-value">{{ missingCount }}</span>
          <span class="stat-label">parcels missing Bldg_SqFt_1000</span>
        </div>
      </div>
      <div class="legend">
        <div class="legend-item">
          <span class="legend-color" style="background: #ff0000;"></span>
          <span>Missing Bldg_SqFt_1000</span>
        </div>
      </div>
      <a href="/" class="back-link">← Back to main app</a>
    </div>
    <div class="map-wrapper">
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <div class="loading-text">Loading parcels...</div>
      </div>
      <div ref="mapContainer" class="map-container">
        <div v-if="hoveredParcel" class="tooltip" :style="{ left: tooltipPosition.x + 15 + 'px', top: tooltipPosition.y + 15 + 'px' }">
          <table>
            <tbody>
              <tr>
                <td class="key">Parcel ID</td>
                <td class="value">{{ hoveredParcel.mapblklot }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
  padding: 20px;
  background: #f5f5f5;
  overflow-y: auto;
  flex-shrink: 0;
  color: #333;
}

.sidebar h1 {
  margin: 0 0 16px 0;
  font-size: 20px;
}

.sidebar p {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.stats {
  margin: 20px 0;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #cc0000;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.legend {
  margin: 20px 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.legend-color {
  width: 24px;
  height: 16px;
  border: 1px solid #999;
}

.back-link {
  display: inline-block;
  margin-top: 20px;
  color: #0066ff;
  text-decoration: none;
  font-size: 14px;
}

.back-link:hover {
  text-decoration: underline;
}

.map-wrapper {
  flex: 1;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top-color: #cc0000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
}

.tooltip .value {
  color: #fff;
}
</style>
