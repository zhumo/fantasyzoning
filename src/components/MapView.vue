<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import 'mapbox-gl/dist/mapbox-gl.css'

import { mapbox } from '../composables/useMapbox.js'
import { parcelData } from '../composables/useParcelData.js'
import { rules } from '../composables/useRules.js'
import { mapInteractions } from '../composables/useMapInteractions.js'
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
const mapContainer = ref(null)

const plan = computed(() => ({
  yourPlanLow: rules.yourPlanLow.value,
  yourPlanHigh: rules.yourPlanHigh.value
}))

async function loadDataset() {
  if (!mapbox.map.value) return

  parcelData.loading.value = true
  mapbox.mapRendering.value = true
  const dataset = DATASETS[currentIndex.value]

  mapbox.clearLayers()

  const [{ geometries }, transitData, publicGeojson] = await Promise.all([
    parcelData.loadParcelData(currentIndex.value),
    parcelData.loadTransitData(),
    parcelData.loadPublicParcels()
  ])

  const geomType = mapbox.addParcelLayer(geometries, dataset.color)
  mapbox.addPublicParcelsLayer(publicGeojson)
  mapbox.addHighlightLayer(geomType)
  mapbox.addTransitLayers(transitData.bart, transitData.muni, transitData.caltrain)

  mapInteractions.setupTransitInteractions()
  mapInteractions.setupParcelInteractions()
  rules.recalculateProjections()

  parcelData.loading.value = false
  mapbox.mapRendering.value = true
  mapbox.onMapIdle(() => {
    mapbox.mapRendering.value = false
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
    rules.updateRule(editingRule.value.id, ruleData)
  } else {
    rules.addRule(ruleData)
  }
  rules.recalculateProjections()
  mapbox.updateMapColors(rules.getProposedHeight, parcelData.parcelAttributes)
  showRuleModal.value = false
  editingRule.value = null
}

async function handleRemoveRule(ruleId) {
  mapbox.mapRendering.value = true
  rules.removeRule(ruleId)
  await new Promise(resolve => setTimeout(resolve, 0))
  rules.recalculateProjections()
  mapbox.updateMapColors(rules.getProposedHeight, parcelData.parcelAttributes)
  mapbox.onMapIdle(() => {
    mapbox.mapRendering.value = false
  })
}

watch(currentIndex, loadDataset)

onMounted(() => {
  mapbox.initializeMap(mapContainer.value)
  mapbox.onMapLoad(loadDataset)
})
</script>

<template>
  <div class="container">
    <div class="main-content">
      <AppSidebar
        :plan="plan"
        :rules="rules.userRules.value"
        @addRule="handleAddRule"
        @editRule="handleEditRule"
        @removeRule="handleRemoveRule"
        @openInfo="showInfoModal = true"
      />
      <div class="map-wrapper">
        <div v-if="mapbox.mapRendering.value" class="map-loading-overlay">
          <div class="spinner"></div>
          <div class="loading-text">Loading parcels...</div>
        </div>
        <div ref="mapContainer" class="map-container"></div>
        <MapTooltip
          v-if="mapInteractions.hoveredParcel.value"
          :parcel="mapInteractions.hoveredParcel.value"
          :stats="mapInteractions.hoveredParcelStats.value"
          :position="mapInteractions.tooltipPosition.value"
        />
        <TransitTooltip
          v-if="mapInteractions.hoveredTransitStop.value"
          :stop="mapInteractions.hoveredTransitStop.value"
          :position="mapInteractions.tooltipPosition.value"
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
