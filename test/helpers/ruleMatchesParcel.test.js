import { describe, it, expect } from 'vitest'
import { ruleMatchesParcel, getProposedHeight } from '../../src/helpers.js'

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
