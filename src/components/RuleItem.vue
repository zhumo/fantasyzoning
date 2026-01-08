<script setup>
defineProps({
  rule: Object
})

defineEmits(['edit', 'remove'])
</script>

<template>
  <div class="rule-item" @click="$emit('edit', rule)">
    <div class="rule-summary">
      <span class="rule-height">{{ rule.proposedHeight }} ft</span>
      <span class="rule-criteria">
        <template v-if="!rule.neighborhood && !rule.zoningCode && !rule.fzpHeight && !rule.transitDistance">
          all parcels
        </template>
        <template v-else>
          <div class="rule-criteria-list">
            <span v-if="rule.neighborhood">{{ rule.neighborhood }}</span>
            <span v-if="rule.zoningCode">{{ rule.neighborhood ? ' · ' : '' }}{{ rule.zoningCode }}</span>
            <span v-if="rule.fzpHeight">{{ (rule.neighborhood || rule.zoningCode) ? ' · ' : '' }}{{ rule.fzpHeight }}ft FZP</span>
            <span v-if="rule.transitDistance">{{ (rule.neighborhood || rule.zoningCode || rule.fzpHeight) ? ' · ' : '' }}within {{ rule.transitDistance }}ft of transit</span>
          </div>
        </template>
      </span>
    </div>
    <button class="delete-rule-btn" @click.stop="$emit('remove', rule.id)">×</button>
  </div>
</template>

<style scoped>
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
</style>
