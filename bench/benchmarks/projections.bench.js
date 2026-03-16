import { bench, describe } from 'vitest'
import { loadTestData } from '../utils/loadTestData.js'
import { recalculateProjections } from '../../src/projectionCalculator.js'

const { parcels, attributes } = loadTestData()

describe('projection calculations', () => {
  bench('fzp-baseline', () => {
    recalculateProjections(parcels, attributes, [])
  })

  bench('all-100ft', () => {
    const parcelsWithFreshCache = parcels.map(p => ({ ...p, unitsCache: {} }))
    const rule = { proposedHeight: 100 }
    recalculateProjections(parcelsWithFreshCache, attributes, [rule])
  })
})
