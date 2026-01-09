<script setup>
import PlanSummaryTable from './PlanSummaryTable.vue'
import RulesList from './RulesList.vue'

defineProps({
  plan: Object,
  rules: Array
})

defineEmits(['addRule', 'editRule', 'removeRule', 'openInfo'])
</script>

<template>
  <div class="sidebar">
    <div class="header-with-info">
      <h1>BYO Zoning</h1>
      <button class="info-icon" @click="$emit('openInfo')" title="About this app">?</button>
    </div>
    <p>Can you save SF from RHNA de-certification?</p>
    <p>Target: 82,069</p>

    <PlanSummaryTable :plan="plan" />

    <RulesList
      :rules="rules"
      @addRule="$emit('addRule')"
      @editRule="$emit('editRule', $event)"
      @removeRule="$emit('removeRule', $event)"
    />
  </div>
</template>

<style scoped>
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
</style>
