export interface ParcelModel {
  BlockLot: string
  Height_Ft: number
  Area_1000: number
  Env_1000_Area_Height: number
  Bldg_SqFt_1000: number
  Res_Dummy: number
  Historic: number
  SDB_2016_5Plus: number
  zp_OfficeComm: number
  zp_DRMulti_RTO: number
  zp_FBDMulti_RTO: number
  zp_PDRInd: number
  zp_Public: number
  zp_Redev: number
  zp_RH2: number
  zp_RH3_RM1: number
  DIST_SBayshore: number
  DIST_BernalHts: number
  DIST_Scentral: number
  DIST_Central: number
  DIST_BuenaVista: number
  DIST_Northeast: number
  DIST_WestAddition: number
  DIST_SOMA: number
  DIST_InnerSunset: number
  DIST_Richmond: number
  DIST_Ingleside: number
  DIST_OuterSunset: number
  DIST_Marina: number
  DIST_Mission: number
  SDB_2016_5Plus_EnvFull: number
  Zoning_DR_EnvFull: number
  fzp_expected_units_low: number
  fzp_expected_units_high: number
  unitsCache: Record<string, number>
}

export interface ParcelOverlay {
  mapblklot: string
  from_address_num?: string
  street_name?: string
  street_type?: string
  streetintersection?: string
  street?: string
  analysis_neighborhood: string
  zoning_code: string
  zoning_district?: string
  supervisor_district: number
  supname: string
  Height_Ft: string
  distance_to_transit?: string
}

export interface PreparedParcel extends Omit<ParcelModel, 'SDB_2016_5Plus' | 'SDB_2016_5Plus_EnvFull' | 'Env_1000_Area_Height'> {
  Env_1000_Area_Height: number
  SDB_2016_5Plus: boolean
  SDB_2016_5Plus_EnvFull: number
}

export interface MacroScenario {
  construction_costs: number
  zillow_re_prices: {
    low: number
    high: number
  }
}

export type MacroScenarios = Record<number, MacroScenario>
export type Scenario = 'low' | 'high'

export const MODEL_NUMERIC_COLS = [
  'Height_Ft', 'Area_1000', 'Env_1000_Area_Height', 'Bldg_SqFt_1000',
  'Res_Dummy', 'Historic', 'SDB_2016_5Plus',
  'zp_OfficeComm', 'zp_DRMulti_RTO', 'zp_FBDMulti_RTO', 'zp_PDRInd',
  'zp_Public', 'zp_Redev', 'zp_RH2', 'zp_RH3_RM1',
  'DIST_SBayshore', 'DIST_BernalHts', 'DIST_Scentral', 'DIST_Central',
  'DIST_BuenaVista', 'DIST_Northeast', 'DIST_WestAddition', 'DIST_SOMA',
  'DIST_InnerSunset', 'DIST_Richmond', 'DIST_Ingleside', 'DIST_OuterSunset',
  'DIST_Marina', 'DIST_Mission', 'SDB_2016_5Plus_EnvFull', 'Zoning_DR_EnvFull',
  'fzp_expected_units_low', 'fzp_expected_units_high'
] as const
