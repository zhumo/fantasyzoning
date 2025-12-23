import { createRouter, createWebHistory } from 'vue-router'
import MapView from './components/MapView.vue'
import TroubleshootMap from './components/TroubleshootMap.vue'

const routes = [
  { path: '/', component: MapView },
  { path: '/troubleshoot', component: TroubleshootMap }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
