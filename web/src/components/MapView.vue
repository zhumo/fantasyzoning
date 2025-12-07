<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { UnitCalculator } from '../unitCalculator.js';

const mapContainer = ref(null);
const map = ref(null);
const currentIndex = ref(0);
const featureCount = ref(0);
const properties = ref([]);
const loading = ref(false);
const hoveredParcel = ref(null);
const hoveredFeature = ref(null);
const tooltipPosition = ref({ x: 0, y: 0 });

const userRules = ref([]);
const fzpZoningData = ref([]);
const parcelAttributes = ref(new Map());
const yourPlanLow = ref(null);
const yourPlanHigh = ref(null);
const calculating = ref(false);

const hoveredParcelStats = computed(() => {
  if (!hoveredParcel.value || fzpZoningData.value.length === 0) return null;

  const mapblklot = hoveredParcel.value.mapblklot;
  const fzpParcel = fzpZoningData.value.find(p => String(p.BlockLot) === mapblklot);
  if (!fzpParcel) return null;

  const proposedHeight = parseFloat(hoveredParcel.value.effective_height) || parseFloat(hoveredParcel.value.fzp_height_ft) || 0;

  const modifiedParcel = { ...fzpParcel };
  if (proposedHeight > fzpParcel.Height_Ft) {
    modifiedParcel.Height_Ft = proposedHeight;
    modifiedParcel.Env_1000_Area_Height = fzpParcel.Area_1000 * proposedHeight;
    modifiedParcel.SDB_2016_5Plus_EnvFull = fzpParcel.SDB_2016_5Plus * modifiedParcel.Env_1000_Area_Height;
  }

  const probLow = UnitCalculator.calc20YearProbability(modifiedParcel, 'low');
  const probHigh = UnitCalculator.calc20YearProbability(modifiedParcel, 'high');
  const units = UnitCalculator.calcUnitsIfRedeveloped(modifiedParcel);

  return {
    probLow: (probLow * 100).toFixed(1),
    probHigh: (probHigh * 100).toFixed(1),
    units: units.toFixed(1)
  };
});

const NEIGHBORHOODS = [
  'Bayview Hunters Point', 'Bernal Heights', 'Castro/Upper Market', 'Chinatown',
  'Excelsior', 'Financial District/South Beach', 'Glen Park', 'Golden Gate Park',
  'Haight Ashbury', 'Hayes Valley', 'Inner Richmond', 'Inner Sunset', 'Japantown',
  'Lakeshore', 'Lincoln Park', 'Lone Mountain/USF', 'Marina', 'McLaren Park',
  'Mission', 'Mission Bay', 'Nob Hill', 'Noe Valley', 'North Beach',
  'Oceanview/Merced/Ingleside', 'Outer Mission', 'Outer Richmond', 'Pacific Heights',
  'Portola', 'Potrero Hill', 'Presidio', 'Presidio Heights', 'Russian Hill',
  'Seacliff', 'South of Market', 'Sunset/Parkside', 'Tenderloin', 'Treasure Island',
  'Twin Peaks', 'Visitacion Valley', 'West of Twin Peaks', 'Western Addition'
];

const ZONING_CODES = [
  'BR-MU', 'C-2', 'C-3-G', 'C-3-O', 'C-3-O(SD)', 'C-3-R', 'C-3-S', 'CCB', 'CMUO',
  'CRNC', 'CVR', 'HP-RA', 'Job Corps', 'M-1', 'M-2', 'MB-O', 'MB-RA', 'MR-MU',
  'MUG', 'MUO', 'MUR', 'NC-1', 'NC-2', 'NC-3', 'NC-S', 'NCD', 'NCT', 'NCT-1',
  'NCT-2', 'NCT-3', 'P70-MU', 'PDR-1-B', 'PDR-1-D', 'PDR-1-G', 'PDR-2', 'PM-CF',
  'PM-MU1', 'PM-MU2', 'PM-OS', 'PM-R', 'PM-S', 'PPS-MU', 'RC-3', 'RC-4', 'RCD',
  'RED', 'RED-MX', 'RH DTR', 'RH-1', 'RH-1(D)', 'RH-1(S)', 'RH-2', 'RH-3',
  'RM-1', 'RM-2', 'RM-3', 'RM-4', 'RTO', 'RTO-M', 'S-MU', 'SALI', 'SB-DTR',
  'SPD', 'TB DTR', 'TI-MU', 'TI-OS', 'TI-R', 'UMU', 'WMUG', 'WMUO',
  'YBI-MU', 'YBI-OS', 'YBI-R'
];

const FZP_HEIGHTS = [
  '40', '45', '50', '55', '60', '65', '70', '80', '85', '100', '105',
  '120', '130', '140', '160', '180', '240', '250', '300', '350', '450', '500', '650'
];

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

function parseNumericCSV(text) {
  const lines = text.split('\n');
  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      const val = values[index] || '';
      row[header] = parseFloat(val) || 0;
    });
    data.push(row);
  }

  return data;
}

function addRule() {
  userRules.value.push({
    id: Date.now(),
    selectionType: 'neighborhood',
    selectionValue: '',
    proposedHeight: '',
    saved: false
  });
}

function saveRule(ruleId) {
  const rule = userRules.value.find(r => r.id === ruleId);
  if (rule && rule.selectionValue && rule.proposedHeight) {
    rule.saved = true;
    recalculateProjections();
    updateMapColors();
  }
}

function removeRule(ruleId) {
  userRules.value = userRules.value.filter(r => r.id !== ruleId);
  recalculateProjections();
  updateMapColors();
}

function ruleMatchesParcel(rule, parcelAttrs) {
  if (!rule.selectionValue) return false;

  switch (rule.selectionType) {
    case 'parcelId':
      return parcelAttrs.mapblklot === rule.selectionValue;
    case 'neighborhood':
      return parcelAttrs.analysis_neighborhood === rule.selectionValue;
    case 'zoningCode':
      return parcelAttrs.zoning_code && parcelAttrs.zoning_code.split('|').includes(rule.selectionValue);
    case 'fzpHeight':
      return parcelAttrs.fzp_height_ft === rule.selectionValue;
  }
  return false;
}

function getProposedHeight(parcelAttrs) {
  let maxHeight = null;

  for (const rule of userRules.value) {
    if (rule.saved && ruleMatchesParcel(rule, parcelAttrs)) {
      const height = parseFloat(rule.proposedHeight);
      if (!isNaN(height) && (maxHeight === null || height > maxHeight)) {
        maxHeight = height;
      }
    }
  }

  return maxHeight;
}

function recalculateProjections() {
  if (fzpZoningData.value.length === 0) return;

  calculating.value = true;

  const modifiedParcels = fzpZoningData.value.map(parcel => {
    const blockLot = String(parcel.BlockLot);
    const attrs = parcelAttributes.value.get(blockLot) || {};
    const proposedHeight = getProposedHeight(attrs);

    if (proposedHeight !== null && proposedHeight > parcel.Height_Ft) {
      const newParcel = { ...parcel };
      newParcel.Height_Ft = proposedHeight;
      newParcel.Env_1000_Area_Height = parcel.Area_1000 * proposedHeight;
      newParcel.SDB_2016_5Plus_EnvFull = parcel.SDB_2016_5Plus * newParcel.Env_1000_Area_Height;
      return newParcel;
    }

    return parcel;
  });

  yourPlanLow.value = Math.round(UnitCalculator.calcTotalExpectedUnits(modifiedParcels, 'low'));
  yourPlanHigh.value = Math.round(UnitCalculator.calcTotalExpectedUnits(modifiedParcels, 'high'));

  calculating.value = false;
}

function updateMapColors() {
  if (!map.value || !map.value.getSource('data')) return;

  const source = map.value.getSource('data');
  const geojson = source._data;

  geojson.features.forEach(feature => {
    const attrs = feature.properties;
    const proposedHeight = getProposedHeight(attrs);
    if (proposedHeight !== null) {
      feature.properties.effective_height = Math.max(
        proposedHeight,
        parseFloat(attrs.fzp_height_ft) || parseFloat(attrs.current_height_ft) || 0
      );
    } else {
      feature.properties.effective_height = parseFloat(attrs.fzp_height_ft) || parseFloat(attrs.current_height_ft) || 0;
    }
  });

  source.setData(geojson);
}


async function loadDataset() {
  if (!map.value) return;

  loading.value = true;
  const dataset = currentDataset();

  if (map.value.getLayer('data-fill')) map.value.removeLayer('data-fill');
  if (map.value.getLayer('data-line')) map.value.removeLayer('data-line');
  if (map.value.getLayer('data-point')) map.value.removeLayer('data-point');
  if (map.value.getLayer('public-fill')) map.value.removeLayer('public-fill');
  if (map.value.getLayer('transit-bart')) map.value.removeLayer('transit-bart');
  if (map.value.getLayer('transit-caltrain')) map.value.removeLayer('transit-caltrain');
  if (map.value.getLayer('highlight-fill')) map.value.removeLayer('highlight-fill');
  if (map.value.getLayer('highlight-line')) map.value.removeLayer('highlight-line');
  if (map.value.getSource('data')) map.value.removeSource('data');
  if (map.value.getSource('public-data')) map.value.removeSource('public-data');
  if (map.value.getSource('transit-bart')) map.value.removeSource('transit-bart');
  if (map.value.getSource('transit-caltrain')) map.value.removeSource('transit-caltrain');
  if (map.value.getSource('highlight')) map.value.removeSource('highlight');

  const [geomResponse, attrResponse, fzpResponse] = await Promise.all([
    fetch(`/data/${dataset.file}`),
    fetch(`/data/${dataset.attributesFile}`),
    fetch('/data/fzp-zoning.csv')
  ]);

  const geometries = await geomResponse.json();
  const attributesText = await attrResponse.text();
  const attributes = parseCSV(attributesText);

  const fzpText = await fzpResponse.text();
  fzpZoningData.value = parseNumericCSV(fzpText);

  const attributesMap = new Map();
  attributes.forEach(attr => {
    attributesMap.set(attr.mapblklot, attr);
  });
  parcelAttributes.value = attributesMap;

  geometries.features.forEach(feature => {
    const mapblklot = feature.properties.mapblklot;
    const attrs = attributesMap.get(mapblklot);
    if (attrs) {
      feature.properties = { ...feature.properties, ...attrs };
    }
    feature.properties.effective_height = parseFloat(feature.properties.fzp_height_ft) || parseFloat(feature.properties.current_height_ft) || 0;
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
    map.value.addLayer({
      id: 'data-fill',
      type: 'fill',
      source: 'data',
      filter: ['!=', ['get', 'current_height_ft'], ''],
      paint: {
        'fill-color': [
          'step',
          ['to-number', ['get', 'effective_height'], 0],
          '#ffffff',
          45, '#c7e9b4',
          65, '#7fcdbb',
          85, '#41b6c4',
          105, '#2c7fb8',
          150, '#253494'
        ],
        'fill-opacity': 1
      }
    });

    map.value.addLayer({
      id: 'data-line',
      type: 'line',
      source: 'data',
      filter: ['!=', ['get', 'current_height_ft'], ''],
      paint: { 'line-color': '#000', 'line-width': 0.5, 'line-opacity': 1 }
    });

    const publicResponse = await fetch('/data/public-parcels.geojson');
    const publicGeojson = await publicResponse.json();

    map.value.addSource('public-data', { type: 'geojson', data: publicGeojson });

    map.value.addLayer({
      id: 'public-fill',
      type: 'fill',
      source: 'public-data',
      paint: {
        'fill-color': 'transparent',
        'fill-opacity': 0
      }
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
  recalculateProjections();
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

function formatNumber(num) {
  if (num === null) return 'TBD';
  return num.toLocaleString();
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
      <h1>Fantasy Zoning</h1>
      <p>Can you save SF from RHNA de-certification?</p>
      <p>Target: 36,000</p>
      <div class="scenarios-table">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Low Growth</th>
              <th>High Growth</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="row-label">FZP</td>
              <td>~10k</td>
              <td>~18k</td>
            </tr>
            <tr class="your-plan">
              <td class="row-label">Your Plan</td>
              <td>{{ formatNumber(yourPlanLow) }}</td>
              <td>{{ formatNumber(yourPlanHigh) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="rules-section">
        <h2>Your Plan</h2>
        <p class="rules-description">Add rules to upzone parcels. When rules overlap, the tallest height wins.</p>

        <div v-for="rule in userRules" :key="rule.id" class="rule-card" :class="{ saved: rule.saved }">
          <div class="rule-row">
            <label>Select by:</label>
            <select v-model="rule.selectionType" @change="rule.selectionValue = ''; rule.saved = false">
              <option value="parcelId">Parcel ID</option>
              <option value="neighborhood">Neighborhood</option>
              <option value="zoningCode">Zoning Code</option>
              <option value="fzpHeight">FZP Height</option>
            </select>
          </div>

          <div class="rule-row">
            <label>Value:</label>
            <input
              v-if="rule.selectionType === 'parcelId'"
              type="text"
              v-model="rule.selectionValue"
              placeholder="e.g. 2993020"
              @input="rule.saved = false"
            />
            <select
              v-else-if="rule.selectionType === 'neighborhood'"
              v-model="rule.selectionValue"
              @change="rule.saved = false"
            >
              <option value="">Select neighborhood...</option>
              <option v-for="n in NEIGHBORHOODS" :key="n" :value="n">{{ n }}</option>
            </select>
            <select
              v-else-if="rule.selectionType === 'zoningCode'"
              v-model="rule.selectionValue"
              @change="rule.saved = false"
            >
              <option value="">Select zoning code...</option>
              <option v-for="z in ZONING_CODES" :key="z" :value="z">{{ z }}</option>
            </select>
            <select
              v-else-if="rule.selectionType === 'fzpHeight'"
              v-model="rule.selectionValue"
              @change="rule.saved = false"
            >
              <option value="">Select FZP height...</option>
              <option v-for="h in FZP_HEIGHTS" :key="h" :value="h">{{ h }} ft</option>
            </select>
          </div>

          <div class="rule-row">
            <label>Proposed Height (ft):</label>
            <input
              type="number"
              v-model="rule.proposedHeight"
              placeholder="e.g. 85"
              @input="rule.saved = false"
            />
          </div>

          <div class="rule-actions">
            <button v-if="!rule.saved" class="save-rule" @click="saveRule(rule.id)" :disabled="!rule.selectionValue || !rule.proposedHeight">Save Rule</button>
            <span v-else class="saved-indicator">Saved</span>
            <button class="delete-rule" @click="removeRule(rule.id)">Remove</button>
          </div>
        </div>

        <button class="add-rule" @click="addRule">+ Add Rule</button>

        <div v-if="calculating" class="calculating">Calculating...</div>
      </div>
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
            <tr v-if="hoveredParcel.fzp_height_ft">
              <td class="key">FZP Height</td>
              <td class="value">{{ hoveredParcel.fzp_height_ft }} ft</td>
            </tr>
            <tr v-if="hoveredParcel.fzp_height_ft">
              <td class="key">Your Proposed Height</td>
              <td class="value">{{ hoveredParcel.effective_height || hoveredParcel.fzp_height_ft }} ft</td>
            </tr>
            <tr v-if="hoveredParcelStats">
              <td class="key">Redev. Probability</td>
              <td class="value">{{ hoveredParcelStats.probLow }}% - {{ hoveredParcelStats.probHigh }}%</td>
            </tr>
            <tr v-if="hoveredParcelStats">
              <td class="key">Units if Redeveloped</td>
              <td class="value">{{ hoveredParcelStats.units }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="legend">
        <div class="legend-title">Height (ft)</div>
        <div class="legend-items">
          <div class="legend-item">
            <span class="legend-color" style="background: #ffffff; border: 1px solid #ccc;"></span>
            <span>0-45</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #c7e9b4;"></span>
            <span>45-65</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #7fcdbb;"></span>
            <span>65-85</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #41b6c4;"></span>
            <span>85-105</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #2c7fb8;"></span>
            <span>105-150</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: #253494;"></span>
            <span>150+</span>
          </div>
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
  padding: 16px;
  background: #f5f5f5;
  overflow-y: auto;
  flex-shrink: 0;
  color: #333;
}

.sidebar h1 {
  margin: 0 0 16px 0;
  font-size: 24px;
}

.scenarios-table {
  margin-bottom: 16px;
}

.scenarios-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.scenarios-table th,
.scenarios-table td {
  border: 1px solid #ccc;
  padding: 8px 12px;
  text-align: center;
}

.scenarios-table th {
  font-weight: 600;
  background: #e8e8e8;
}

.scenarios-table .row-label {
  font-weight: 600;
  text-align: left;
  background: #e8e8e8;
}

.scenarios-table .your-plan td {
  font-weight: 700;
}

.rules-section {
  margin-top: 20px;
}

.rules-section h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.rules-description {
  font-size: 13px;
  color: #666;
  margin: 0 0 12px 0;
}

.rule-card {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.rule-row {
  margin-bottom: 10px;
}

.rule-row label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #555;
}

.rule-row select,
.rule-row input {
  width: 100%;
  padding: 8px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #333;
  box-sizing: border-box;
}

.rule-row input:focus,
.rule-row select:focus {
  outline: none;
  border-color: #0066ff;
}

.rule-card.saved {
  border-color: #090;
  background: #f0fff0;
}

.rule-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.save-rule {
  flex: 1;
  padding: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #090;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-rule:hover {
  background: #070;
}

.save-rule:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.saved-indicator {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #090;
}

.delete-rule {
  padding: 8px 12px;
  font-size: 12px;
  color: #c00;
  background: #fff;
  border: 1px solid #c00;
  border-radius: 4px;
  cursor: pointer;
}

.delete-rule:hover {
  background: #fee;
}

.add-rule {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #0066ff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-rule:hover {
  background: #0055dd;
}

.calculating {
  text-align: center;
  padding: 10px;
  color: #666;
  font-style: italic;
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

.legend {
  position: absolute;
  bottom: 30px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  z-index: 5;
}

.legend-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.legend-color {
  width: 20px;
  height: 14px;
  border: 1px solid #999;
}
</style>
