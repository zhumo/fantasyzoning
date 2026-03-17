export function ruleMatchesParcel(rule, parcelAttrs) {
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

export function getProposedHeight(rules, parcelAttrs) {
  let maxHeight = null

  for (const rule of rules) {
    if (ruleMatchesParcel(rule, parcelAttrs)) {
      const height = rule.proposedHeight
      if (maxHeight === null || height > maxHeight) {
        maxHeight = height
      }
    }
  }

  return maxHeight
}

export function getParcelAddress(parcel) {
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

export function formatNumber(num) {
  if (num === null) return null
  return num.toLocaleString()
}
