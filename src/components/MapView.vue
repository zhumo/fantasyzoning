<script setup>
import { onMounted, ref, watch } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'

import { useMapbox } from '../composables/useMapbox.js'
import { useParcelData } from '../composables/useParcelData.js'
import { useRules } from '../composables/useRules.js'
import { useMapInteractions } from '../composables/useMapInteractions.js'
import { DATASETS } from '../constants/datasets.js'

import AppSidebar from './AppSidebar.vue'
import RuleModal from './RuleModal.vue'
import InfoModal from './InfoModal.vue'
import MapTooltip from './MapTooltip.vue'
import TransitTooltip from './TransitTooltip.vue'
import MapLegend from './MapLegend.vue'

const currentIndex = ref(0)
const showRuleModal = ref(false)
const showInfoModal = ref(false)
const editingRule = ref(null)

const {
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
} = useMapbox()

const {
  fzpZoningData,
  allParcelsData,
  parcelAttributes,
  loading,
  loadParcelData,
  loadTransitData,
  loadPublicParcels
} = useParcelData()

const {
  userRules,
  yourPlanLow,
  yourPlanHigh,
  calculating,
  getProposedHeight,
  recalculateProjections,
  addRule,
  updateRule,
  removeRule
} = useRules(parcelAttributes, allParcelsData)

const {
  hoveredParcel,
  hoveredTransitStop,
  tooltipPosition,
  hoveredParcelStats,
  setupParcelInteractions,
  setupTransitInteractions
} = useMapInteractions(map, fzpZoningData, setHighlightFeature)

async function loadDataset() {
  if (!map.value) return

  loading.value = true
  mapRendering.value = true
  const dataset = DATASETS[currentIndex.value]

  clearLayers()

  const [{ geometries }, transitData, publicGeojson] = await Promise.all([
    loadParcelData(currentIndex.value),
    loadTransitData(),
    loadPublicParcels()
  ])

  const geomType = addParcelLayer(geometries, dataset.color)
  addPublicParcelsLayer(publicGeojson)
  addHighlightLayer(geomType)
  addTransitLayers(transitData.bart, transitData.muni, transitData.caltrain)

  setupTransitInteractions()
  setupParcelInteractions()
  recalculateProjections()

  loading.value = false
  mapRendering.value = true
  onMapIdle(() => {
    mapRendering.value = false
  })
}

function handleAddRule() {
  editingRule.value = null
  showRuleModal.value = true
}

function handleEditRule(rule) {
  editingRule.value = rule
  showRuleModal.value = true
}

function handleSaveRule(ruleData) {
  if (editingRule.value) {
    updateRule(editingRule.value.id, ruleData)
  } else {
    addRule(ruleData)
  }
  recalculateProjections()
  updateMapColors(getProposedHeight, parcelAttributes)
  showRuleModal.value = false
  editingRule.value = null
}

async function handleRemoveRule(ruleId) {
  mapRendering.value = true
  removeRule(ruleId)
  await new Promise(resolve => setTimeout(resolve, 0))
  recalculateProjections()
  updateMapColors(getProposedHeight, parcelAttributes)
  onMapIdle(() => {
    mapRendering.value = false
  })
}

watch(currentIndex, loadDataset)

onMounted(() => {
  initializeMap(mapContainer.value)
  onMapLoad(loadDataset)
})
</script>

<template>
  <div class="container">
    <div class="main-content">
      <AppSidebar
        :yourPlanLow="yourPlanLow"
        :yourPlanHigh="yourPlanHigh"
        :userRules="userRules"
        :calculating="calculating"
        @addRule="handleAddRule"
        @editRule="handleEditRule"
        @removeRule="handleRemoveRule"
        @openInfo="showInfoModal = true"
      />
      <div class="map-wrapper">
        <div v-if="mapRendering" class="map-loading-overlay">
          <div class="spinner"></div>
          <div class="loading-text">Loading parcels...</div>
        </div>
        <div ref="mapContainer" class="map-container"></div>
        <MapTooltip
          v-if="hoveredParcel"
          :parcel="hoveredParcel"
          :stats="hoveredParcelStats"
          :position="tooltipPosition"
        />
        <TransitTooltip
          v-if="hoveredTransitStop"
          :stop="hoveredTransitStop"
          :position="tooltipPosition"
        />
        <MapLegend />
      </div>
    </div>
    <div class="attribution">made with 🏠 by <a href="https://www.github.com/zhumo/fantasyzoning" target="_blank">Mo Zhu</a></div>

    <RuleModal
      :show="showRuleModal"
      :editingRule="editingRule"
      @close="showRuleModal = false; editingRule = null"
      @save="handleSaveRule"
    />

    <InfoModal
      :show="showInfoModal"
      @close="showInfoModal = false"
    />
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

.map-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
