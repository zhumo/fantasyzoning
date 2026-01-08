<script setup>
defineProps({
  parcel: Object,
  stats: Object,
  position: Object
})

function getParcelAddress(parcel) {
  if (parcel.from_address_num && parcel.street_name) {
    const num = parcel.from_address_num
    const street = parcel.street_name
    const type = parcel.street_type || ''
    return `${num} ${street} ${type}`.trim()
  }
  if (parcel.streetintersection) {
    return parcel.streetintersection
  }
  if (parcel.street) {
    return parcel.street
  }
  return parcel.mapblklot || 'Unknown Address'
}
</script>

<template>
  <div class="tooltip" :style="{ left: position.x + 15 + 'px', top: position.y + 15 + 'px' }">
    <table>
      <tbody>
        <tr v-if="parcel.from_address_num || parcel.street_name">
          <td class="key">Address</td>
          <td class="value">{{ getParcelAddress(parcel) }}</td>
        </tr>
        <tr v-if="parcel.analysis_neighborhood">
          <td class="key">Neighborhood</td>
          <td class="value">{{ parcel.analysis_neighborhood }}</td>
        </tr>
        <tr v-if="parcel.zoning_code">
          <td class="key">Zoning Code</td>
          <td class="value">{{ parcel.zoning_code }}</td>
        </tr>
        <tr v-if="parcel.zoning_district">
          <td class="key">Zoning District</td>
          <td class="value">{{ parcel.zoning_district }}</td>
        </tr>
        <tr>
          <td class="key">Supervisor</td>
          <td class="value">{{ parcel.supname }} (D{{ Math.floor(parcel.supervisor_district) }})</td>
        </tr>
        <tr v-if="parcel.mapblklot">
          <td class="key">Parcel ID</td>
          <td class="value">{{ parcel.mapblklot }}</td>
        </tr>
        <tr v-if="parcel.blklots">
          <td class="key"># Units</td>
          <td class="value">{{ Array(parcel.blklots).length }}</td>
        </tr>
        <tr v-if="parcel.Height_Ft">
          <td class="key">FZP Height</td>
          <td class="value">{{ Math.floor(parcel.Height_Ft) }} ft</td>
        </tr>
        <tr v-if="parcel.Height_Ft">
          <td class="key">Your Proposed Height</td>
          <td class="value">{{ Math.floor(parcel.effective_height || parcel.Height_Ft) }} ft</td>
        </tr>
        <tr v-if="stats">
          <td class="key">Redev. Probability</td>
          <td class="value">{{ stats.probLow }}% - {{ stats.probHigh }}%</td>
        </tr>
        <tr v-if="stats">
          <td class="key">Units if Redeveloped</td>
          <td class="value">{{ stats.units }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 13px;
  pointer-events: none;
  z-index: 10;
  max-width: 300px;
}

.tooltip table {
  border-collapse: collapse;
}

.tooltip td {
  padding: 3px 6px;
}

.tooltip .key {
  font-weight: bold;
  color: #ccc;
  padding-right: 12px;
  white-space: nowrap;
}

.tooltip .value {
  color: #fff;
}
</style>
