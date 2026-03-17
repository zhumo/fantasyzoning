import { ParcelCalculator } from './calculators/parcelCalculator'
import { getProposedHeight } from './helpers.js'

function calcExpectedUnitsWithCache(parcel, height, scenario) {
  const cacheKey = `${height}_${scenario}`
  if (parcel.unitsCache[cacheKey] !== undefined) {
    return parcel.unitsCache[cacheKey]
  }

  const modifiedParcel = { ...parcel, Height_Ft: height }
  const calc = new ParcelCalculator(modifiedParcel)
  const result = scenario === 'low' ? calc.getExpectedUnitsLow() : calc.getExpectedUnitsHigh()
  parcel.unitsCache[cacheKey] = result
  return result
}

export function recalculateProjections(allParcelsData, parcelAttributes, userRules) {
  if (allParcelsData.length === 0) return { low: 0, high: 0 }

  let totalLow = 0
  let totalHigh = 0

  for (const parcel of allParcelsData) {
    const blockLot = String(parcel.BlockLot)
    const attrs = parcelAttributes.get(blockLot) || {}
    const proposedHeight = getProposedHeight(userRules, attrs)

    if (proposedHeight !== null && proposedHeight > parcel.Height_Ft) {
      totalLow += calcExpectedUnitsWithCache(parcel, proposedHeight, 'low')
      totalHigh += calcExpectedUnitsWithCache(parcel, proposedHeight, 'high')
    } else {
      totalLow += parcel.fzp_expected_units_low
      totalHigh += parcel.fzp_expected_units_high
    }
  }

  return {
    low: Math.round(totalLow),
    high: Math.round(totalHigh)
  }
}
