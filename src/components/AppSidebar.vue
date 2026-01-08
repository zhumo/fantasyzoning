<script setup>
defineProps({
  yourPlanLow: Number,
  yourPlanHigh: Number,
  userRules: Array,
  calculating: Boolean
})

defineEmits(['addRule', 'editRule', 'removeRule', 'openInfo'])

function formatNumber(num) {
  if (num === null) return null
  return num.toLocaleString()
}
</script>

<template>
  <div class="sidebar">
    <div class="header-with-info">
      <h1>BYO Zoning</h1>
      <button class="info-icon" @click="$emit('openInfo')" title="About this app">?</button>
    </div>
    <p>Can you save SF from RHNA de-certification?</p>
    <p>Target: 82,069</p>
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
            <td>{{ formatNumber(yourPlanLow) || "---" }}</td>
            <td>{{ formatNumber(yourPlanHigh) || "---" }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rules-section">
      <h2>Your Plan</h2>
      <p class="rules-description">When rules overlap, the tallest height wins.</p>

      <div v-for="rule in userRules" :key="rule.id" class="rule-item" @click="$emit('editRule', rule)">
        <div class="rule-summary">
          <span class="rule-height">{{ rule.proposedHeight }} ft</span>
          <span class="rule-criteria">
            <template v-if="!rule.neighborhood && !rule.zoningCode && !rule.fzpHeight && !rule.transitDistance">all parcels</template>
            <template v-else>
              <div class="rule-criteria-list">
                <span v-if="rule.neighborhood">{{ rule.neighborhood }}</span>
                <span v-if="rule.zoningCode">{{ (rule.neighborhood) ? ' · ' : '' }}{{ rule.zoningCode }}</span>
                <span v-if="rule.fzpHeight">{{ (rule.neighborhood || rule.zoningCode) ? ' · ' : '' }}{{ rule.fzpHeight }}ft FZP</span>
                <span v-if="rule.transitDistance">{{ (rule.neighborhood || rule.zoningCode || rule.fzpHeight) ? ' · ' : '' }}within {{ rule.transitDistance }}ft of transit</span>
              </div>
            </template>
          </span>
        </div>
        <button class="delete-rule-btn" @click.stop="$emit('removeRule', rule.id)">×</button>
      </div>

      <button class="add-rule" @click="$emit('addRule')">+ Add Rule</button>

      <div v-if="calculating" class="calculating">Calculating...</div>
    </div>
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

.rule-criteria-list {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
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
</style>
