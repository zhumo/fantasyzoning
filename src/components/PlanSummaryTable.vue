<script setup>
defineProps({
  plan: Object
})

function formatNumber(num) {
  if (num === null || num === undefined) return null
  return num.toLocaleString()
}
</script>

<template>
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
          <td>{{ formatNumber(plan?.low) || "---" }}</td>
          <td>{{ formatNumber(plan?.high) || "---" }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
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
</style>
