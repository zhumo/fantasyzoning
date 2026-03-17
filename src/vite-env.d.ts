/// <reference types="vite/client" />

declare module '*.csv?raw' {
  const content: string
  export default content
}

declare module '*/prob-reg-weights.json' {
  const weights: {
    Intercept: number
    Height_Ft: number
    Area_1000: number
    Env_1000_Area_Height: number
    Bldg_SqFt_1000: number
    Res_Dummy: number
    Historic: number
    Const_Costs_Real: number
    Zillow_Price_Real: number
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
  }
  export default weights
}

declare module '*/units-reg-weights.json' {
  const weights: {
    Intercept: number
    Env_1000_Area_Height: number
    SDB_2016_5Plus_EnvFull: number
    Zoning_DR_EnvFull: number
  }
  export default weights
}
