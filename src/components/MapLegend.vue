<script setup>
import { HEIGHT_COLOR_STEPS } from '../constants/heightColors.js'
</script>

<template>
  <div class="legend">
    <div class="legend-title">Height (ft)</div>
    <div class="legend-items">
      <div v-for="step in HEIGHT_COLOR_STEPS" :key="step.threshold" class="legend-item">
        <span class="legend-color" :style="{ background: step.color }"></span>
        <span>{{ step.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
