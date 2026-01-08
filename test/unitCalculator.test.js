import { describe, it, expect } from 'vitest'
import { UnitCalculator } from '../src/unitCalculator.js'

describe('UnitCalculator', () => {
  describe('sigmoid', () => {
    it('returns 0.5 for input 0', () => {
      const result = 1 / (1 + Math.exp(-0))
      expect(result).toBe(0.5)
    })

    it('approaches 1 for large positive values', () => {
      const result = 1 / (1 + Math.exp(-10))
      expect(result).toBeGreaterThan(0.999)
    })

    it('approaches 0 for large negative values', () => {
      const result = 1 / (1 + Math.exp(10))
      expect(result).toBeLessThan(0.001)
    })
  })

  describe('calcAnnualProbability', () => {
    const baseParcel = {
      Height_Ft: 65,
      Area_1000: 5,
      Env_1000_Area_Height: 32.5,
      Bldg_SqFt_1000: 10,
      Res_Dummy: 1,
      Historic: 0,
      SDB_2016_5Plus: 1,
      zp_OfficeComm: 0,
      zp_DRMulti_RTO: 0,
      zp_FBDMulti_RTO: 0,
      zp_PDRInd: 0,
      zp_Public: 0,
      zp_Redev: 0,
      zp_RH2: 1,
      zp_RH3_RM1: 0,
      DIST_SBayshore: 0,
      DIST_BernalHts: 0,
      DIST_Scentral: 0,
      DIST_Central: 0,
      DIST_BuenaVista: 0,
      DIST_Northeast: 0,
      DIST_WestAddition: 0,
      DIST_SOMA: 0,
      DIST_InnerSunset: 0,
      DIST_Richmond: 0,
      DIST_Ingleside: 0,
      DIST_OuterSunset: 0,
      DIST_Marina: 0,
      DIST_Mission: 1,
    }

    it('returns a probability between 0 and 1', () => {
      const prob = UnitCalculator.calcAnnualProbability(baseParcel, 2026, 'low')
      expect(prob).toBeGreaterThan(0)
      expect(prob).toBeLessThan(1)
    })

    it('returns higher probability for high scenario in later years', () => {
      const probLow2030 = UnitCalculator.calcAnnualProbability(baseParcel, 2030, 'low')
      const probHigh2030 = UnitCalculator.calcAnnualProbability(baseParcel, 2030, 'high')
      expect(probHigh2030).toBeGreaterThan(probLow2030)
    })

    it('returns same probability for 2026-2027 regardless of scenario', () => {
      const probLow = UnitCalculator.calcAnnualProbability(baseParcel, 2026, 'low')
      const probHigh = UnitCalculator.calcAnnualProbability(baseParcel, 2026, 'high')
      expect(probLow).toBe(probHigh)
    })
  })

  describe('calc20YearProbability', () => {
    const baseParcel = {
      Height_Ft: 85,
      Area_1000: 10,
      Env_1000_Area_Height: 85,
      Bldg_SqFt_1000: 20,
      Res_Dummy: 0,
      Historic: 0,
      SDB_2016_5Plus: 1,
      zp_OfficeComm: 0,
      zp_DRMulti_RTO: 1,
      zp_FBDMulti_RTO: 0,
      zp_PDRInd: 0,
      zp_Public: 0,
      zp_Redev: 0,
      zp_RH2: 0,
      zp_RH3_RM1: 0,
      DIST_SBayshore: 0,
      DIST_BernalHts: 0,
      DIST_Scentral: 0,
      DIST_Central: 0,
      DIST_BuenaVista: 0,
      DIST_Northeast: 0,
      DIST_WestAddition: 0,
      DIST_SOMA: 1,
      DIST_InnerSunset: 0,
      DIST_Richmond: 0,
      DIST_Ingleside: 0,
      DIST_OuterSunset: 0,
      DIST_Marina: 0,
      DIST_Mission: 0,
    }

    it('returns probability between 0 and 1', () => {
      const prob = UnitCalculator.calc20YearProbability(baseParcel, 'low')
      expect(prob).toBeGreaterThan(0)
      expect(prob).toBeLessThan(1)
    })

    it('high scenario yields higher or equal 20-year probability', () => {
      const probLow = UnitCalculator.calc20YearProbability(baseParcel, 'low')
      const probHigh = UnitCalculator.calc20YearProbability(baseParcel, 'high')
      expect(probHigh).toBeGreaterThanOrEqual(probLow)
    })

    it('historic parcels have lower probability', () => {
      const nonHistoric = UnitCalculator.calc20YearProbability(baseParcel, 'low')
      const historic = UnitCalculator.calc20YearProbability({ ...baseParcel, Historic: 1 }, 'low')
      expect(historic).toBeLessThan(nonHistoric)
    })
  })

  describe('calcUnitsIfRedeveloped', () => {
    it('returns 0 for zero envelope', () => {
      const parcel = {
        Env_1000_Area_Height: 0,
        SDB_2016_5Plus_EnvFull: 0,
        Zoning_DR_EnvFull: 0,
      }
      expect(UnitCalculator.calcUnitsIfRedeveloped(parcel)).toBe(0)
    })

    it('returns positive units for positive envelope', () => {
      const parcel = {
        Env_1000_Area_Height: 50,
        SDB_2016_5Plus_EnvFull: 50,
        Zoning_DR_EnvFull: 0,
      }
      expect(UnitCalculator.calcUnitsIfRedeveloped(parcel)).toBeGreaterThan(0)
    })

    it('SDB parcels yield more units', () => {
      const withoutSDB = {
        Env_1000_Area_Height: 50,
        SDB_2016_5Plus_EnvFull: 0,
        Zoning_DR_EnvFull: 0,
      }
      const withSDB = {
        Env_1000_Area_Height: 50,
        SDB_2016_5Plus_EnvFull: 50,
        Zoning_DR_EnvFull: 0,
      }
      expect(UnitCalculator.calcUnitsIfRedeveloped(withSDB)).toBeGreaterThan(
        UnitCalculator.calcUnitsIfRedeveloped(withoutSDB)
      )
    })

    it('density-restricted zoning reduces units', () => {
      const nonDR = {
        Env_1000_Area_Height: 50,
        SDB_2016_5Plus_EnvFull: 0,
        Zoning_DR_EnvFull: 0,
      }
      const DR = {
        Env_1000_Area_Height: 50,
        SDB_2016_5Plus_EnvFull: 0,
        Zoning_DR_EnvFull: 50,
      }
      expect(UnitCalculator.calcUnitsIfRedeveloped(DR)).toBeLessThan(
        UnitCalculator.calcUnitsIfRedeveloped(nonDR)
      )
    })
  })

  describe('calcExpectedUnits', () => {
    const parcel = {
      Height_Ft: 85,
      Area_1000: 10,
      Env_1000_Area_Height: 85,
      Bldg_SqFt_1000: 5,
      Res_Dummy: 0,
      Historic: 0,
      SDB_2016_5Plus: 1,
      SDB_2016_5Plus_EnvFull: 85,
      Zoning_DR_EnvFull: 0,
      zp_OfficeComm: 0,
      zp_DRMulti_RTO: 1,
      zp_FBDMulti_RTO: 0,
      zp_PDRInd: 0,
      zp_Public: 0,
      zp_Redev: 0,
      zp_RH2: 0,
      zp_RH3_RM1: 0,
      DIST_SBayshore: 0,
      DIST_BernalHts: 0,
      DIST_Scentral: 0,
      DIST_Central: 0,
      DIST_BuenaVista: 0,
      DIST_Northeast: 0,
      DIST_WestAddition: 0,
      DIST_SOMA: 1,
      DIST_InnerSunset: 0,
      DIST_Richmond: 0,
      DIST_Ingleside: 0,
      DIST_OuterSunset: 0,
      DIST_Marina: 0,
      DIST_Mission: 0,
    }

    it('returns non-negative expected units', () => {
      const expected = UnitCalculator.calcExpectedUnits(parcel, 'low')
      expect(expected).toBeGreaterThanOrEqual(0)
    })

    it('high scenario yields more expected units', () => {
      const expectedLow = UnitCalculator.calcExpectedUnits(parcel, 'low')
      const expectedHigh = UnitCalculator.calcExpectedUnits(parcel, 'high')
      expect(expectedHigh).toBeGreaterThanOrEqual(expectedLow)
    })
  })

  describe('calcTotalExpectedUnits', () => {
    it('returns 0 for empty array', () => {
      expect(UnitCalculator.calcTotalExpectedUnits([], 'low')).toBe(0)
    })

    it('sums expected units across parcels', () => {
      const parcels = [
        {
          Height_Ft: 65, Area_1000: 5, Env_1000_Area_Height: 32.5, Bldg_SqFt_1000: 10,
          Res_Dummy: 0, Historic: 0, SDB_2016_5Plus: 1, SDB_2016_5Plus_EnvFull: 32.5, Zoning_DR_EnvFull: 0,
          zp_OfficeComm: 0, zp_DRMulti_RTO: 1, zp_FBDMulti_RTO: 0, zp_PDRInd: 0, zp_Public: 0, zp_Redev: 0, zp_RH2: 0, zp_RH3_RM1: 0,
          DIST_SBayshore: 0, DIST_BernalHts: 0, DIST_Scentral: 0, DIST_Central: 0, DIST_BuenaVista: 0, DIST_Northeast: 0,
          DIST_WestAddition: 0, DIST_SOMA: 1, DIST_InnerSunset: 0, DIST_Richmond: 0, DIST_Ingleside: 0, DIST_OuterSunset: 0, DIST_Marina: 0, DIST_Mission: 0,
        },
        {
          Height_Ft: 85, Area_1000: 8, Env_1000_Area_Height: 68, Bldg_SqFt_1000: 15,
          Res_Dummy: 0, Historic: 0, SDB_2016_5Plus: 1, SDB_2016_5Plus_EnvFull: 68, Zoning_DR_EnvFull: 0,
          zp_OfficeComm: 0, zp_DRMulti_RTO: 0, zp_FBDMulti_RTO: 1, zp_PDRInd: 0, zp_Public: 0, zp_Redev: 0, zp_RH2: 0, zp_RH3_RM1: 0,
          DIST_SBayshore: 0, DIST_BernalHts: 0, DIST_Scentral: 0, DIST_Central: 0, DIST_BuenaVista: 0, DIST_Northeast: 0,
          DIST_WestAddition: 0, DIST_SOMA: 0, DIST_InnerSunset: 0, DIST_Richmond: 0, DIST_Ingleside: 0, DIST_OuterSunset: 0, DIST_Marina: 0, DIST_Mission: 1,
        },
      ]
      const total = UnitCalculator.calcTotalExpectedUnits(parcels, 'low')
      const sum = parcels.reduce((acc, p) => acc + UnitCalculator.calcExpectedUnits(p, 'low'), 0)
      expect(total).toBeCloseTo(sum, 10)
    })
  })

  describe('MACRO_SCENARIOS', () => {
    it('has entries for years 2026-2045', () => {
      for (let year = 2026; year <= 2045; year++) {
        expect(UnitCalculator.MACRO_SCENARIOS[year]).toBeDefined()
        expect(UnitCalculator.MACRO_SCENARIOS[year].costs).toBeDefined()
        expect(UnitCalculator.MACRO_SCENARIOS[year].priceLow).toBeDefined()
        expect(UnitCalculator.MACRO_SCENARIOS[year].priceHigh).toBeDefined()
      }
    })

    it('high prices diverge from low prices after 2027', () => {
      expect(UnitCalculator.MACRO_SCENARIOS[2027].priceLow).toBe(UnitCalculator.MACRO_SCENARIOS[2027].priceHigh)
      expect(UnitCalculator.MACRO_SCENARIOS[2028].priceHigh).toBeGreaterThan(UnitCalculator.MACRO_SCENARIOS[2028].priceLow)
    })
  })
})
