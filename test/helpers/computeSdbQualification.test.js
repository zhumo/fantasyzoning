import { describe, it, expect } from 'vitest'
import {
  SDB_ENVELOPE_THRESHOLD,
  SDB_HEIGHT_CAP,
  computeSdbQualification,
} from '../../src/helpers.js'

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
