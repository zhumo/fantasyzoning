import { describe, it, expect } from 'vitest'
import { getParcelAddress, formatNumber } from '../../src/helpers.js'

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
