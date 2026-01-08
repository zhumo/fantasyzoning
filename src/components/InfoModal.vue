<script setup>
defineProps({
  show: Boolean
})

defineEmits(['close'])
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal info-modal">
      <div class="modal-header">
        <h3>What is BYO Zoning?</h3>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body info-modal-body">
        <ol class="info-list">
          <li>
            <strong>San Francisco must upzone</strong> to meet the state's RHNA (Regional Housing Needs Allocation) requirements. If the City fails to comply, it risks losing local control over housing decisions and facing state intervention.
          </li>
          <li>
            <strong>SF passed the Family Zoning Plan (FZP)</strong> in 2025, which aims to meet our RHNA goal of producing 82,069 new housing units.
          </li>
          <li>
            <strong>However, the City Economist has projected</strong> that in the best case scenario, the FZP would only meet approximately 50% of our goal (generating 8,000-18,000 units instead of the required 82,069).
          </li>
          <li>
            This app allows you to <strong>see what level of upzoning is necessary</strong> for SF to meet its goal. The app uses the City Economist's predictive model to project expected housing production under your plan.
          </li>

          <strong>Made by Mo Zhu.</strong> Report bugs, view the source code, and learn more at <a href="https://www.github.com/zhumo/fantasyzoning" target="_blank">github.com/zhumo/fantasyzoning</a>
        </ol>
      </div>
      <div class="modal-footer">
        <button class="modal-save" @click="$emit('close')">Got it</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.info-modal {
  max-width: 600px;
  width: 90vw;
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

.info-modal-body {
  max-height: 70vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
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
