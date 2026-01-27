export const SDB_ENVELOPE_THRESHOLD = 9.0
export const SDB_HEIGHT_CAP = 130

export function computeSdbQualification(envelope, height) {
  return envelope > SDB_ENVELOPE_THRESHOLD && height <= SDB_HEIGHT_CAP ? 1 : 0
}

export function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

export function parseCSV(text) {
  const lines = text.split('\n')
  const headers = parseCSVLine(lines[0])
  const data = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }

  return data
}

export function parseNumericCSV(text) {
  const lines = text.split('\n')
  const headers = parseCSVLine(lines[0])
  const data = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((header, index) => {
      const val = values[index] || ''
      row[header] = header === 'BlockLot' ? val : (parseFloat(val) || 0)
    })
    data.push(row)
  }

  return data
}

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
