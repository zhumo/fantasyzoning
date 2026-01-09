<script setup>
defineProps({
  stop: Object,
  position: Object
})
</script>

<template>
  <div class="tooltip transit-tooltip" :style="{ left: position.x + 15 + 'px', top: position.y + 15 + 'px' }">
    <div class="transit-name">{{ stop.name }}</div>
    <div class="transit-route">{{ stop.route }}</div>
  </div>
</template>

<style scoped>
.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  border-radius: 4px;
  font-size: 13px;
  pointer-events: none;
  z-index: 10;
}

.transit-tooltip {
  padding: 8px 12px;
}

.transit-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.transit-route {
  font-size: 12px;
  color: #aaa;
}
</style>
