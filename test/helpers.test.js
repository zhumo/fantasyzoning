import { describe, it, expect } from 'vitest'
import {
  SDB_ENVELOPE_THRESHOLD,
  SDB_HEIGHT_CAP,
  computeSdbQualification,
  parseCSVLine,
  parseCSV,
  parseNumericCSV,
  ruleMatchesParcel,
  getProposedHeight,
  getParcelAddress,
  formatNumber,
} from '../src/helpers.js'

describe('SDB Constants', () => {
  it('has correct threshold values', () => {
    expect(SDB_ENVELOPE_THRESHOLD).toBe(9.0)
    expect(SDB_HEIGHT_CAP).toBe(130)
  })
})

describe('computeSdbQualification', () => {
  it('returns 1 when envelope > 9.0 and height <= 130', () => {
    expect(computeSdbQualification(10, 100)).toBe(1)
    expect(computeSdbQualification(9.1, 130)).toBe(1)
    expect(computeSdbQualification(50, 65)).toBe(1)
  })

  it('returns 0 when envelope <= 9.0', () => {
    expect(computeSdbQualification(9.0, 100)).toBe(0)
    expect(computeSdbQualification(5, 50)).toBe(0)
    expect(computeSdbQualification(0, 65)).toBe(0)
  })

  it('returns 0 when height > 130', () => {
    expect(computeSdbQualification(50, 131)).toBe(0)
    expect(computeSdbQualification(100, 200)).toBe(0)
  })

  it('returns 0 at exact boundary (envelope = 9.0)', () => {
    expect(computeSdbQualification(9.0, 100)).toBe(0)
  })

  it('returns 1 at exact boundary (height = 130)', () => {
    expect(computeSdbQualification(10, 130)).toBe(1)
  })
})

describe('parseCSVLine', () => {
  it('parses simple comma-separated values', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('handles quoted fields with commas', () => {
    expect(parseCSVLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd'])
  })

  it('trims whitespace', () => {
    expect(parseCSVLine(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('handles empty fields', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c'])
  })

  it('handles single value', () => {
    expect(parseCSVLine('hello')).toEqual(['hello'])
  })

  it('handles empty string', () => {
    expect(parseCSVLine('')).toEqual([''])
  })
})

describe('parseCSV', () => {
  it('parses CSV with headers', () => {
    const csv = 'name,age\nAlice,30\nBob,25'
    const result = parseCSV(csv)
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('skips empty lines', () => {
    const csv = 'name,age\nAlice,30\n\nBob,25\n'
    const result = parseCSV(csv)
    expect(result).toHaveLength(2)
  })

  it('handles quoted fields', () => {
    const csv = 'address,city\n"123 Main St, Apt 4",SF'
    const result = parseCSV(csv)
    expect(result[0].address).toBe('123 Main St, Apt 4')
  })

  it('handles missing values', () => {
    const csv = 'a,b,c\n1,,3'
    const result = parseCSV(csv)
    expect(result[0]).toEqual({ a: '1', b: '', c: '3' })
  })
})

describe('parseNumericCSV', () => {
  it('converts values to numbers', () => {
    const csv = 'BlockLot,Height_Ft,Area_1000\n123,65,5.5'
    const result = parseNumericCSV(csv)
    expect(result[0].Height_Ft).toBe(65)
    expect(result[0].Area_1000).toBe(5.5)
  })

  it('preserves BlockLot as string', () => {
    const csv = 'BlockLot,Height_Ft\n0012345,65'
    const result = parseNumericCSV(csv)
    expect(result[0].BlockLot).toBe('0012345')
  })

  it('converts non-numeric values to 0', () => {
    const csv = 'BlockLot,Height_Ft\n123,invalid'
    const result = parseNumericCSV(csv)
    expect(result[0].Height_Ft).toBe(0)
  })

  it('handles empty values as 0', () => {
    const csv = 'BlockLot,Height_Ft\n123,'
    const result = parseNumericCSV(csv)
    expect(result[0].Height_Ft).toBe(0)
  })
})

describe('ruleMatchesParcel', () => {
  it('matches when rule has no criteria', () => {
    const rule = { proposedHeight: 85 }
    const parcel = { analysis_neighborhood: 'Mission', zoning_code: 'RH-2' }
    expect(ruleMatchesParcel(rule, parcel)).toBe(true)
  })

  it('matches on neighborhood', () => {
    const rule = { neighborhood: 'Mission' }
    expect(ruleMatchesParcel(rule, { analysis_neighborhood: 'Mission' })).toBe(true)
    expect(ruleMatchesParcel(rule, { analysis_neighborhood: 'SOMA' })).toBe(false)
  })

  it('matches on zoning code (exact)', () => {
    const rule = { zoningCode: 'RH-2' }
    expect(ruleMatchesParcel(rule, { zoning_code: 'RH-2' })).toBe(true)
    expect(ruleMatchesParcel(rule, { zoning_code: 'RH-3' })).toBe(false)
  })

  it('matches on zoning code in pipe-separated list', () => {
    const rule = { zoningCode: 'RH-2' }
    expect(ruleMatchesParcel(rule, { zoning_code: 'RH-1|RH-2|RH-3' })).toBe(true)
    expect(ruleMatchesParcel(rule, { zoning_code: 'RM-1|RM-2' })).toBe(false)
  })

  it('returns false when zoning_code is missing', () => {
    const rule = { zoningCode: 'RH-2' }
    expect(ruleMatchesParcel(rule, {})).toBe(false)
  })

  it('matches on FZP height', () => {
    const rule = { fzpHeight: '65' }
    expect(ruleMatchesParcel(rule, { Height_Ft: '65' })).toBe(true)
    expect(ruleMatchesParcel(rule, { Height_Ft: '85' })).toBe(false)
  })

  it('matches on transit distance', () => {
    const rule = { transitDistance: 500 }
    expect(ruleMatchesParcel(rule, { distance_to_transit: '400' })).toBe(true)
    expect(ruleMatchesParcel(rule, { distance_to_transit: '500' })).toBe(true)
    expect(ruleMatchesParcel(rule, { distance_to_transit: '600' })).toBe(false)
  })

  it('returns false when transit distance is NaN', () => {
    const rule = { transitDistance: 500 }
    expect(ruleMatchesParcel(rule, { distance_to_transit: 'invalid' })).toBe(false)
    expect(ruleMatchesParcel(rule, {})).toBe(false)
  })

  it('requires ALL criteria to match (AND logic)', () => {
    const rule = { neighborhood: 'Mission', zoningCode: 'RH-2', fzpHeight: '65' }
    expect(ruleMatchesParcel(rule, {
      analysis_neighborhood: 'Mission',
      zoning_code: 'RH-2',
      Height_Ft: '65'
    })).toBe(true)
    expect(ruleMatchesParcel(rule, {
      analysis_neighborhood: 'Mission',
      zoning_code: 'RH-2',
      Height_Ft: '85'
    })).toBe(false)
  })
})

describe('getProposedHeight', () => {
  it('returns null when no rules', () => {
    expect(getProposedHeight([], {})).toBe(null)
  })

  it('returns null when no rules match', () => {
    const rules = [{ proposedHeight: 85, neighborhood: 'SOMA' }]
    expect(getProposedHeight(rules, { analysis_neighborhood: 'Mission' })).toBe(null)
  })

  it('returns height when single rule matches', () => {
    const rules = [{ proposedHeight: 85, neighborhood: 'Mission' }]
    expect(getProposedHeight(rules, { analysis_neighborhood: 'Mission' })).toBe(85)
  })

  it('returns max height when multiple rules match', () => {
    const rules = [
      { proposedHeight: 65 },
      { proposedHeight: 85 },
      { proposedHeight: 45 },
    ]
    expect(getProposedHeight(rules, {})).toBe(85)
  })

  it('only considers matching rules for max height', () => {
    const rules = [
      { proposedHeight: 100, neighborhood: 'SOMA' },
      { proposedHeight: 65, neighborhood: 'Mission' },
      { proposedHeight: 45 },
    ]
    expect(getProposedHeight(rules, { analysis_neighborhood: 'Mission' })).toBe(65)
  })
})

describe('getParcelAddress', () => {
  it('formats full address with number, street, and type', () => {
    const parcel = {
      from_address_num: '123',
      street_name: 'Main',
      street_type: 'St'
    }
    expect(getParcelAddress(parcel)).toBe('123 Main St')
  })

  it('formats address without street type', () => {
    const parcel = {
      from_address_num: '456',
      street_name: 'Broadway'
    }
    expect(getParcelAddress(parcel)).toBe('456 Broadway')
  })

  it('falls back to streetintersection', () => {
    const parcel = { streetintersection: 'Main St & Broadway' }
    expect(getParcelAddress(parcel)).toBe('Main St & Broadway')
  })

  it('falls back to street', () => {
    const parcel = { street: 'Mission Street' }
    expect(getParcelAddress(parcel)).toBe('Mission Street')
  })

  it('falls back to mapblklot', () => {
    const parcel = { mapblklot: '1234567' }
    expect(getParcelAddress(parcel)).toBe('1234567')
  })

  it('returns Unknown Address when no fields present', () => {
    expect(getParcelAddress({})).toBe('Unknown Address')
  })
})

describe('formatNumber', () => {
  it('returns null for null input', () => {
    expect(formatNumber(null)).toBe(null)
  })

  it('formats integers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1000000)).toBe('1,000,000')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('formats decimals', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56')
  })
})
