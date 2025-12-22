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
const mapRendering = ref(false);
const hoveredParcel = ref(null);
const hoveredFeature = ref(null);
const tooltipPosition = ref({ x: 0, y: 0 });

const userRules = ref([]);
const fzpZoningData = ref([]);
const parcelAttributes = ref(new Map());
const yourPlanLow = ref(null);
const yourPlanHigh = ref(null);
const calculating = ref(false);

const showModal = ref(false);
const showInfoModal = ref(false);
const editingRuleId = ref(null);
const savingRule = ref(false);
const newRule = ref({
  proposedHeight: '',
  neighborhood: '',
  zoningCode: '',
  fzpHeight: ''
});

const hoveredParcelStats = computed(() => {
  if (!hoveredParcel.value || fzpZoningData.value.length === 0) return null;

  const mapblklot = hoveredParcel.value.mapblklot;
  const fzpParcel = fzpZoningData.value.find(p => String(p.BlockLot) === mapblklot);
  if (!fzpParcel) return null;

  const proposedHeight = parseFloat(hoveredParcel.value.effective_height) || parseFloat(hoveredParcel.value.fzp_height_ft) || 0;

  const modifiedParcel = { ...fzpParcel };
  if (proposedHeight > fzpParcel.Height_Ft) {
    modifiedParcel.Height_Ft = proposedHeight;
    modifiedParcel.Env_1000_Area_Height = fzpParcel.Area_1000 * proposedHeight / 10;
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
      row[header] = header === 'BlockLot' ? val : (parseFloat(val) || 0);
    });
    data.push(row);
  }

  return data;
}

function openAddRuleModal() {
  editingRuleId.value = null;
  newRule.value = {
    proposedHeight: '',
    neighborhood: '',
    zoningCode: '',
    fzpHeight: ''
  };
  showModal.value = true;
}

function openEditRuleModal(rule) {
  editingRuleId.value = rule.id;
  newRule.value = {
    proposedHeight: rule.proposedHeight,
    neighborhood: rule.neighborhood || '',
    zoningCode: rule.zoningCode || '',
    fzpHeight: rule.fzpHeight || ''
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingRuleId.value = null;
}

function toggleInfoModal() {
  showInfoModal.value = !showInfoModal.value;
}

async function saveRule() {
  const height = parseInt(newRule.value.proposedHeight);
  if (isNaN(height) || height <= 0) return;

  savingRule.value = true;

  await new Promise(resolve => setTimeout(resolve, 0));

  if (editingRuleId.value) {
    const ruleIndex = userRules.value.findIndex(r => r.id === editingRuleId.value);
    if (ruleIndex !== -1) {
      userRules.value[ruleIndex] = {
        id: editingRuleId.value,
        proposedHeight: height,
        neighborhood: newRule.value.neighborhood || null,
        zoningCode: newRule.value.zoningCode || null,
        fzpHeight: newRule.value.fzpHeight || null
      };
    }
  } else {
    userRules.value.push({
      id: Date.now(),
      proposedHeight: height,
      neighborhood: newRule.value.neighborhood || null,
      zoningCode: newRule.value.zoningCode || null,
      fzpHeight: newRule.value.fzpHeight || null
    });
  }

  recalculateProjections();
  updateMapColors();

  savingRule.value = false;
  showModal.value = false;
  editingRuleId.value = null;
}

async function removeRule(ruleId) {
  mapRendering.value = true;
  userRules.value = userRules.value.filter(r => r.id !== ruleId);

  await new Promise(resolve => setTimeout(resolve, 0));

  recalculateProjections();
  updateMapColors();

  map.value.once('idle', () => {
    mapRendering.value = false;
  });
}

function ruleMatchesParcel(rule, parcelAttrs) {
  if (rule.neighborhood && parcelAttrs.analysis_neighborhood !== rule.neighborhood) {
    return false;
  }
  if (rule.zoningCode && (!parcelAttrs.zoning_code || !parcelAttrs.zoning_code.split('|').includes(rule.zoningCode))) {
    return false;
  }
  if (rule.fzpHeight && parcelAttrs.fzp_height_ft !== rule.fzpHeight) {
    return false;
  }
  return true;
}

function getProposedHeight(parcelAttrs) {
  let maxHeight = null;

  for (const rule of userRules.value) {
    if (ruleMatchesParcel(rule, parcelAttrs)) {
      const height = rule.proposedHeight;
      if (maxHeight === null || height > maxHeight) {
        maxHeight = height;
      }
    }
  }

  return maxHeight;
}

function calcExpectedUnitsWithCache(parcel, height, scenario) {
  const cacheKey = `${height}_${scenario}`;
  if (parcel.unitsCache[cacheKey] !== undefined) {
    return parcel.unitsCache[cacheKey];
  }

  const modifiedParcel = { ...parcel };
  modifiedParcel.Height_Ft = height;
  modifiedParcel.Env_1000_Area_Height = parcel.Area_1000 * height / 10;
  modifiedParcel.SDB_2016_5Plus_EnvFull = parcel.SDB_2016_5Plus * modifiedParcel.Env_1000_Area_Height;

  const result = UnitCalculator.calcExpectedUnits(modifiedParcel, scenario);
  parcel.unitsCache[cacheKey] = result;
  return result;
}

function recalculateProjections() {
  if (fzpZoningData.value.length === 0) return;

  calculating.value = true;

  let totalLow = 0;
  let totalHigh = 0;

  for (const parcel of fzpZoningData.value) {
    const blockLot = String(parcel.BlockLot);
    const attrs = parcelAttributes.value.get(blockLot) || {};
    const proposedHeight = getProposedHeight(attrs);

    if (proposedHeight !== null && proposedHeight > parcel.Height_Ft) {
      totalLow += calcExpectedUnitsWithCache(parcel, proposedHeight, 'low');
      totalHigh += calcExpectedUnitsWithCache(parcel, proposedHeight, 'high');
    } else {
      totalLow += parcel.fzp_expected_units_low;
      totalHigh += parcel.fzp_expected_units_high;
    }
  }

  yourPlanLow.value = Math.round(totalLow);
  yourPlanHigh.value = Math.round(totalHigh);

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
  mapRendering.value = true;
  const dataset = currentDataset();

  if (map.value.getLayer('data-fill')) map.value.removeLayer('data-fill');
  if (map.value.getLayer('data-point')) map.value.removeLayer('data-point');
  if (map.value.getLayer('public-fill')) map.value.removeLayer('public-fill');
  if (map.value.getLayer('highlight-fill')) map.value.removeLayer('highlight-fill');
  if (map.value.getLayer('highlight-line')) map.value.removeLayer('highlight-line');
  if (map.value.getSource('data')) map.value.removeSource('data');
  if (map.value.getSource('public-data')) map.value.removeSource('public-data');
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
  const parsedFzpData = parseNumericCSV(fzpText);
  parsedFzpData.forEach(parcel => {
    parcel.unitsCache = {};
  });
  fzpZoningData.value = parsedFzpData;

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
          'transparent',
          45, '#c7e9b4',
          65, '#7fcdbb',
          85, '#41b6c4',
          105, '#2c7fb8',
          150, '#253494'
        ],
        'fill-opacity': 1
      }
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

  mapRendering.value = true;
  map.value.once('idle', () => {
    mapRendering.value = false;
  });
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
  if (num === null) return null;
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
    minZoom: 10,
    maxZoom: 18,
    maxBounds: [[-122.55, 37.65], [-122.28, 37.85]]
  });

  map.value.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.value.on('load', loadDataset);
});
</script>

<template>
  <div class="container">
    <div class="main-content">
      <div class="sidebar">
      <div class="header-with-info">
        <h1>Fantasy Zoning</h1>
        <button class="info-icon" @click="toggleInfoModal" title="About this app">?</button>
      </div>
      <p>Can you save SF from RHNA de-certification?</p>
      <p>Target: 36,200</p>
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
              <td>{{ formatNumber(yourPlanLow) || "10,268" }}</td>
              <td>{{ formatNumber(yourPlanHigh) || "17,775" }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="rules-section">
        <h2>Your Plan</h2>
        <p class="rules-description">When rules overlap, the tallest height wins.</p>

        <div v-for="rule in userRules" :key="rule.id" class="rule-item" @click="openEditRuleModal(rule)">
          <div class="rule-summary">
            <span class="rule-height">{{ rule.proposedHeight }} ft</span>
            <span class="rule-criteria">
              <template v-if="!rule.neighborhood && !rule.zoningCode && !rule.fzpHeight">all parcels</template>
              <template v-else>
                <span v-if="rule.neighborhood">{{ rule.neighborhood }}</span>
                <span v-if="rule.zoningCode">{{ rule.neighborhood ? ' · ' : '' }}{{ rule.zoningCode }}</span>
                <span v-if="rule.fzpHeight">{{ (rule.neighborhood || rule.zoningCode) ? ' · ' : '' }}{{ rule.fzpHeight }}ft FZP</span>
              </template>
            </span>
          </div>
          <button class="delete-rule-btn" @click.stop="removeRule(rule.id)">×</button>
        </div>

        <button class="add-rule" @click="openAddRuleModal">+ Add Rule</button>

        <div v-if="calculating" class="calculating">Calculating...</div>
      </div>
    </div>
    <div class="map-wrapper">
      <div v-if="mapRendering" class="map-loading-overlay">
        <div class="spinner"></div>
        <div class="loading-text">Loading parcels...</div>
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
              <td class="value">{{ hoveredParcel.supname }} (D{{ Math.floor(hoveredParcel.supervisor_district) }})</td>
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
              <td class="value">{{ Math.floor(hoveredParcel.fzp_height_ft) }} ft</td>
            </tr>
            <tr v-if="hoveredParcel.fzp_height_ft">
              <td class="key">Your Proposed Height</td>
              <td class="value">{{ Math.floor(hoveredParcel.effective_height || hoveredParcel.fzp_height_ft) }} ft</td>
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
            <span class="legend-color" style="background: transparent; border: 1px solid #ccc;"></span>
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
    </div>
    <div class="attribution">made with 🏠 by <a href="https://www.github.com/zhumo/fantasyzoning" target="_blank">Mo Zhu</a></div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingRuleId ? 'Edit Rule' : 'Add Rule' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="natural-language-form">
            <span class="form-text">Set height</span>
            <input
              type="number"
              v-model="newRule.proposedHeight"
              class="inline-input height-input"
              placeholder="ft"
            />
            <span class="form-text">ft. for all parcels</span>

            <div class="criteria-row">
              <span class="form-text">in neighborhood</span>
              <select v-model="newRule.neighborhood" class="inline-select">
                <option value="">any</option>
                <option v-for="n in NEIGHBORHOODS" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>

            <div class="criteria-row">
              <span class="form-text">with zoning code</span>
              <select v-model="newRule.zoningCode" class="inline-select">
                <option value="">any</option>
                <option v-for="z in ZONING_CODES" :key="z" :value="z">{{ z }}</option>
              </select>
            </div>

            <div class="criteria-row">
              <span class="form-text">and FZP height</span>
              <select v-model="newRule.fzpHeight" class="inline-select">
                <option value="">any</option>
                <option v-for="h in FZP_HEIGHTS" :key="h" :value="h">{{ h }} ft</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel" @click="closeModal" :disabled="savingRule">Cancel</button>
          <button class="modal-save" @click="saveRule" :disabled="!newRule.proposedHeight || savingRule">
            <span v-if="savingRule" class="button-spinner"></span>
            {{ savingRule ? 'Calculating...' : (editingRuleId ? 'Update Rule' : 'Save Rule') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showInfoModal" class="modal-overlay" @click.self="toggleInfoModal">
      <div class="modal info-modal">
        <div class="modal-header">
          <h3>What is Fantasy Zoning?</h3>
          <button class="modal-close" @click="toggleInfoModal">×</button>
        </div>
        <div class="modal-body info-modal-body">
          <ol class="info-list">
            <li>
              <strong>San Francisco must upzone</strong> to meet the state's RHNA (Regional Housing Needs Allocation) requirements. If the City fails to comply, it risks losing local control over housing decisions and facing state intervention.
            </li>
            <li>
              <strong>SF passed the Family Zoning Plan (FZP)</strong> in 2025, which aims to meet our RHNA goal of producing 36,200 new housing units.
            </li>
            <li>
              <strong>However, the City Economist has projected</strong> that in the best case scenario, the FZP would only meet approximately 50% of our goal (generating 8,000-18,000 units instead of the required 36,200).
            </li>
            <li>
              <strong>This app allows you to test</strong> what kinds of upzoning programs will allow SF to meet its goal. You can create custom zoning rules by specifying height limits for different neighborhoods, zoning codes, and FZP heights. The app uses the City Economist's predictive model to project expected housing production under your plan.
            </li>
            <li>
              <strong>Current limitations</strong> (working on fixing these): Does not work on the east side of the city—only the parts where the FZP was applied. Does not allow for upzoning within a specific distance of landmarks such as transit stops and grocery stores.
            </li>
            <li>
              <strong>Made by Mo Zhu.</strong> View the source code and learn more at <a href="https://www.github.com/zhumo/fantasyzoning" target="_blank">github.com/zhumo/fantasyzoning</a>
            </li>
          </ol>
        </div>
        <div class="modal-footer">
          <button class="modal-save" @click="toggleInfoModal">Got it</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
}

.sidebar {
  width: 320px;
  padding: 16px;
  background: #f5f5f5;
  overflow-y: auto;
  flex-shrink: 0;
  color: #333;
}

.header-with-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}

.sidebar h1 {
  margin: 0;
  font-size: 24px;
}

.info-icon {
  width: 22px;
  height: 22px;
  min-width: 22px;
  min-height: 22px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  color: #0066ff;
  border: 2px solid #0066ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  box-sizing: border-box;
}

.info-icon:hover {
  background: #f0f7ff;
  border-color: #0055dd;
  color: #0055dd;
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

.map-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.map-container {
  flex: 1;
  position: relative;
}

.attribution {
  padding: 14px 16px;
  background: transparent;
  font-size: 12px;
  color: #ccc;
  text-align: center;
}

.attribution a {
  color: #fff;
  text-decoration: none;
}

.attribution a:hover {
  text-decoration: underline;
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

.no-rules {
  color: #888;
  font-size: 13px;
  font-style: italic;
  margin-bottom: 12px;
}

.rule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 10px;
  margin-bottom: 8px;
  cursor: pointer;
}

.rule-item:hover {
  border-color: #0066ff;
  background: #f8faff;
}

.rule-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.rule-height {
  color: #090;
  font-weight: 600;
  white-space: nowrap;
}

.rule-criteria {
  color: #666;
  font-size: 12px;
}

.delete-rule-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.delete-rule-btn:hover {
  color: #c00;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 8px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.modal-cancel {
  padding: 10px 20px;
  font-size: 14px;
  color: #666;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.modal-cancel:hover {
  background: #eee;
}

.modal-save {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #0066ff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-save:hover {
  background: #0055dd;
}

.modal-save:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.natural-language-form {
  font-size: 15px;
  line-height: 2.2;
  color: #333;
}

.form-text {
  color: #333;
}

.inline-input {
  border: none;
  border-bottom: 2px solid #0066ff;
  padding: 4px 8px;
  font-size: 15px;
  background: #f8f8f8;
  border-radius: 2px 2px 0 0;
  color: #333;
}

.inline-input:focus {
  outline: none;
  background: #fff;
}

.height-input {
  width: 60px;
  text-align: center;
}

.criteria-row {
  display: block;
  margin-top: 4px;
}

.inline-select {
  border: none;
  border-bottom: 2px solid #0066ff;
  padding: 4px 8px;
  font-size: 15px;
  background: #f8f8f8;
  border-radius: 2px 2px 0 0;
  color: #333;
  cursor: pointer;
  min-width: 120px;
}

.inline-select:focus {
  outline: none;
  background: #fff;
}

.map-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
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
  border-top-color: #0066ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

.button-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.info-modal {
  max-width: 600px;
  width: 90vw;
}

.info-modal-body {
  max-height: 70vh;
  overflow-y: auto;
}

.info-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.6;
}

.info-list li {
  margin-bottom: 16px;
  color: #333;
  font-size: 14px;
}

.info-list li:last-child {
  margin-bottom: 0;
}

.info-list a {
  color: #0066ff;
  text-decoration: none;
}

.info-list a:hover {
  text-decoration: underline;
}
</style>
