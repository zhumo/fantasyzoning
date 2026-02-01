import { ParcelCalculator } from './parcelCalculator.js'

export class PlanCalculator {
  constructor(parcels) {
    this.parcels = parcels
  }

  ruleMatchesParcel(rule, parcel) {
    if (rule.neighborhood && parcel.analysis_neighborhood !== rule.neighborhood) {
      return false
    }
    if (rule.zoningCode && (!parcel.zoning_code || !parcel.zoning_code.split('|').includes(rule.zoningCode))) {
      return false
    }
    if (rule.fzpHeight && parcel.Height_Ft !== rule.fzpHeight) {
      return false
    }
    if (rule.transitDistance) {
      const distToTransit = parseFloat(parcel.distance_to_transit)
      if (isNaN(distToTransit) || distToTransit > rule.transitDistance) {
        return false
      }
    }
    return true
  }

  getProposedHeight(rules, parcel) {
    let maxHeight = null
    for (const rule of rules) {
      if (this.ruleMatchesParcel(rule, parcel)) {
        if (maxHeight === null || rule.proposedHeight > maxHeight) {
          maxHeight = rule.proposedHeight
        }
      }
    }
    return maxHeight
  }

  calculate(rules) {
    let totalLow = 0
    let totalHigh = 0
    const parcelResults = new Map()

    for (const parcel of this.parcels) {
      const mapblklot = String(parcel.BlockLot)

      const proposedHeight = this.getProposedHeight(rules, parcel)
      const effectiveHeight = (proposedHeight !== null && proposedHeight > parcel.Height_Ft)
        ? proposedHeight
        : parcel.Height_Ft

      const modifiedParcel = effectiveHeight > parcel.Height_Ft
        ? { ...parcel, Height_Ft: effectiveHeight }
        : parcel
      const calc = new ParcelCalculator(modifiedParcel)

      let unitsLow, unitsHigh
      if (effectiveHeight > parcel.Height_Ft) {
        unitsLow = calc.getExpectedUnitsLow() ?? 0
        unitsHigh = calc.getExpectedUnitsHigh() ?? 0
      } else {
        unitsLow = parcel.fzp_expected_units_low ?? 0
        unitsHigh = parcel.fzp_expected_units_high ?? 0
      }

      totalLow += unitsLow
      totalHigh += unitsHigh

      parcelResults.set(mapblklot, {
        effectiveHeight,
        expectedUnitsLow: unitsLow,
        expectedUnitsHigh: unitsHigh,
        probabilityLow: calc.getProbabilityLow(),
        probabilityHigh: calc.getProbabilityHigh(),
        unitsIfRedeveloped: calc.getUnitsIfRedeveloped()
      })
    }

    return {
      totals: { low: Math.round(totalLow), high: Math.round(totalHigh) },
      parcelResults
    }
  }
}
