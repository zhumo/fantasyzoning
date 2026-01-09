<script setup>
import RuleItem from './RuleItem.vue'

defineProps({
  rules: Array
})

defineEmits(['addRule', 'editRule', 'removeRule'])
</script>

<template>
  <div class="rules-section">
    <h2>Your Plan</h2>
    <p class="rules-description">When rules overlap, the tallest height wins.</p>

    <RuleItem
      v-for="rule in rules"
      :key="rule.id"
      :rule="rule"
      @edit="$emit('editRule', $event)"
      @remove="$emit('removeRule', $event)"
    />

    <button class="add-rule" @click="$emit('addRule')">+ Add Rule</button>
  </div>
</template>

<style scoped>
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
</style>
