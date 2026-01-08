import { ref } from 'vue'
import { SDB_ENVELOPE_THRESHOLD, SDB_HEIGHT_CAP } from '../constants/sdb.js'
import { UnitCalculator } from '../unitCalculator.js'
import { parcelData } from './useParcelData.js'

export function computeSdbQualification(envelope, height) {
  return envelope > SDB_ENVELOPE_THRESHOLD && height <= SDB_HEIGHT_CAP ? 1 : 0
}

const userRules = ref([])
const yourPlanLow = ref(null)
const yourPlanHigh = ref(null)
const calculating = ref(false)

function ruleMatchesParcel(rule, parcelAttrs) {
  if (rule.neighborhood && parcelAttrs.analysis_neighborhood !== rule.neighborhood) {
    return false
  }
  if (rule.zoningCode && (!parcelAttrs.zoning_code || !parcelAttrs.zoning_code.split('|').includes(rule.zoningCode))) {
    return false
  }
  if (rule.fzpHeight && parcelAttrs.Height_Ft !== rule.fzpHeight) {
    return false
  }
  if (rule.transitDistance) {
    const distToTransit = parseFloat(parcelAttrs.distance_to_transit)
    if (isNaN(distToTransit) || distToTransit > rule.transitDistance) {
      return false
    }
  }
  return true
}

function getProposedHeight(parcelAttrs) {
  let maxHeight = null

  for (const rule of userRules.value) {
    if (ruleMatchesParcel(rule, parcelAttrs)) {
      const height = rule.proposedHeight
      if (maxHeight === null || height > maxHeight) {
        maxHeight = height
      }
    }
  }

  return maxHeight
}

function calcExpectedUnitsWithCache(parcel, height, scenario) {
  const cacheKey = `${height}_${scenario}`
  if (parcel.unitsCache[cacheKey] !== undefined) {
    return parcel.unitsCache[cacheKey]
  }

  const modifiedParcel = { ...parcel }
  modifiedParcel.Height_Ft = height
  modifiedParcel.Env_1000_Area_Height = parcel.Area_1000 * height / 10
  modifiedParcel.SDB_2016_5Plus = computeSdbQualification(modifiedParcel.Env_1000_Area_Height, height)
  modifiedParcel.SDB_2016_5Plus_EnvFull = modifiedParcel.SDB_2016_5Plus * modifiedParcel.Env_1000_Area_Height

  const result = UnitCalculator.calcExpectedUnits(modifiedParcel, scenario)
  parcel.unitsCache[cacheKey] = result
  return result
}

function recalculateProjections() {
  if (parcelData.allParcelsData.value.length === 0) return

  calculating.value = true

  let totalLow = 0
  let totalHigh = 0

  for (const parcel of parcelData.allParcelsData.value) {
    const blockLot = String(parcel.BlockLot)
    const attrs = parcelData.parcelAttributes.value.get(blockLot) || {}
    const proposedHeight = getProposedHeight(attrs)

    if (proposedHeight !== null && proposedHeight > parcel.Height_Ft) {
      totalLow += calcExpectedUnitsWithCache(parcel, proposedHeight, 'low')
      totalHigh += calcExpectedUnitsWithCache(parcel, proposedHeight, 'high')
    } else {
      totalLow += parcel.fzp_expected_units_low
      totalHigh += parcel.fzp_expected_units_high
    }
  }

  yourPlanLow.value = Math.round(totalLow)
  yourPlanHigh.value = Math.round(totalHigh)

  calculating.value = false
}

function addRule(rule) {
  userRules.value.push({
    id: Date.now(),
    ...rule
  })
}

function updateRule(ruleId, updates) {
  const ruleIndex = userRules.value.findIndex(r => r.id === ruleId)
  if (ruleIndex !== -1) {
    userRules.value[ruleIndex] = {
      id: ruleId,
      ...updates
    }
  }
}

function removeRule(ruleId) {
  userRules.value = userRules.value.filter(r => r.id !== ruleId)
}

export const rules = {
  userRules,
  yourPlanLow,
  yourPlanHigh,
  calculating,
  ruleMatchesParcel,
  getProposedHeight,
  calcExpectedUnitsWithCache,
  recalculateProjections,
  addRule,
  updateRule,
  removeRule
}
