<script setup>
import MapView from './components/MapView.vue'
</script>

<template>
  <h1>Rezoner</h1>
  <div class="scenarios-table">
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Current Zoning</th>
          <th>FZP</th>
          <th class="your-plan">Your Plan</th>
          <th>Target</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-label">Low Growth</td>
          <td>1,594</td>
          <td>10,098</td>
          <td class="your-plan">TBD</td>
          <td>36,200</td>
        </tr>
        <tr>
          <td class="row-label">High Growth</td>
          <td>3,199</td>
          <td>17,845</td>
          <td class="your-plan">TBD</td>
          <td>36,200</td>
        </tr>
      </tbody>
    </table>
  </div>
  <MapView />
</template>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.scenarios-table {
  margin: 0 auto 16px auto;
  display: flex;
  justify-content: center;
}

.scenarios-table table {
  border-collapse: collapse;
  font-size: 14px;
}

.scenarios-table th,
.scenarios-table td {
  border: 1px solid #ccc;
  padding: 8px 16px;
  text-align: center;
}

.scenarios-table th {
  font-weight: 600;
}

.scenarios-table .row-label {
  font-weight: 600;
}

.scenarios-table .your-plan {
  min-width: 80px;
  font-weight: 700;
}
</style>
