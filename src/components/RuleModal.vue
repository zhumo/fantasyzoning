<script setup>
import { ref, watch } from 'vue'
import { NEIGHBORHOODS } from '../constants/neighborhoods.js'
import { ZONING_CODES } from '../constants/zoningCodes.js'
import { FZP_HEIGHTS } from '../constants/fzpHeights.js'

const props = defineProps({
  show: Boolean,
  editingRule: Object
})

const emit = defineEmits(['close', 'save'])

const saving = ref(false)
const formData = ref({
  proposedHeight: '',
  neighborhood: '',
  zoningCode: '',
  fzpHeight: '',
  transitDistance: ''
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.editingRule) {
      formData.value = {
        proposedHeight: props.editingRule.proposedHeight,
        neighborhood: props.editingRule.neighborhood || '',
        zoningCode: props.editingRule.zoningCode || '',
        fzpHeight: props.editingRule.fzpHeight || '',
        transitDistance: props.editingRule.transitDistance || ''
      }
    } else {
      formData.value = {
        proposedHeight: '',
        neighborhood: '',
        zoningCode: '',
        fzpHeight: '',
        transitDistance: ''
      }
    }
  }
})

async function handleSave() {
  const height = parseInt(formData.value.proposedHeight)
  if (isNaN(height) || height <= 0) return

  saving.value = true
  await new Promise(resolve => setTimeout(resolve, 0))

  emit('save', {
    proposedHeight: height,
    neighborhood: formData.value.neighborhood || null,
    zoningCode: formData.value.zoningCode || null,
    fzpHeight: formData.value.fzpHeight || null,
    transitDistance: formData.value.transitDistance ? parseInt(formData.value.transitDistance) : null
  })

  saving.value = false
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ editingRule ? 'Edit Rule' : 'Add Rule' }}</h3>
        <button class="modal-close" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="natural-language-form">
          <span class="form-text">Set height</span>
          <input
            type="number"
            v-model="formData.proposedHeight"
            class="inline-input height-input"
            placeholder="ft"
          />
          <span class="form-text">ft. for all parcels</span>

          <div class="criteria-row">
            <span class="form-text">in neighborhood</span>
            <select v-model="formData.neighborhood" class="inline-select">
              <option value="">any</option>
              <option v-for="n in NEIGHBORHOODS" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>

          <div class="criteria-row">
            <span class="form-text">with zoning code</span>
            <select v-model="formData.zoningCode" class="inline-select">
              <option value="">any</option>
              <option v-for="z in ZONING_CODES" :key="z" :value="z">{{ z }}</option>
            </select>
          </div>

          <div class="criteria-row">
            <span class="form-text">and FZP height</span>
            <select v-model="formData.fzpHeight" class="inline-select">
              <option value="">any</option>
              <option v-for="h in FZP_HEIGHTS" :key="h" :value="h">{{ h }} ft</option>
            </select>
          </div>

          <div class="criteria-row">
            <span class="form-text">within</span>
            <input
              type="number"
              v-model="formData.transitDistance"
              min="0"
              max="50000"
              step="100"
              class="inline-input distance-input"
              placeholder="ft"
            />
            <span class="form-text">ft of a transit stop</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-cancel" @click="$emit('close')" :disabled="saving">Cancel</button>
        <button class="modal-save" @click="handleSave" :disabled="!formData.proposedHeight || saving">
          <span v-if="saving" class="button-spinner"></span>
          {{ saving ? 'Calculating...' : (editingRule ? 'Update Rule' : 'Save Rule') }}
        </button>
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

.distance-input {
  width: 70px;
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
</style>
