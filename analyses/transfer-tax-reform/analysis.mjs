import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

const PROB_WEIGHTS = {
  Intercept: -1.6226, Height_Ft: 0.0017, Area_1000: 0.0049, Env_1000_Area_Height: 0.0002,
  Bldg_SqFt_1000: -0.0023, Res_Dummy: -0.8231, Historic: -1.0378, Const_Costs_Real: -0.0992,
  Zillow_Price_Real: 0.0143, SDB_2016_5Plus: 0.6303, zp_OfficeComm: 4.2634, zp_DRMulti_RTO: 4.2450,
  zp_FBDMulti_RTO: 5.0508, zp_PDRInd: 3.4115, zp_Public: 1.2491, zp_Redev: 4.5361,
  zp_RH2: 0.2674, zp_RH3_RM1: 1.3187, DIST_SBayshore: -1.4824, DIST_BernalHts: -1.7011,
  DIST_Scentral: -1.7307, DIST_Central: -1.1523, DIST_BuenaVista: -2.5369, DIST_Northeast: -1.4171,
  DIST_WestAddition: -0.6831, DIST_SOMA: -0.0756, DIST_InnerSunset: -1.6187, DIST_Richmond: -2.8019,
  DIST_Ingleside: -1.8670, DIST_OuterSunset: -2.6147, DIST_Marina: -1.2492, DIST_Mission: -1.0938
};

const UNITS_WEIGHTS = {
  Intercept: 0.0,
  Env_1000_Area_Height: 0.4252,
  SDB_2016_5Plus_EnvFull: 0.4385,
  Zoning_DR_EnvFull: -0.1601
};

const BASE_COST = 112.723;
const MULTIPLIER = 2; // Land value ~2x construction cost

const PRICES = {
  2026: [78.091, 78.091], 2027: [77.203, 77.203], 2028: [78.537, 86.719],
  2029: [79.895, 96.236], 2030: [81.275, 105.752], 2031: [82.680, 115.268],
  2032: [84.108, 124.784], 2033: [85.562, 128.587], 2034: [87.041, 132.506],
  2035: [88.545, 136.544], 2036: [90.075, 140.706], 2037: [91.631, 144.994],
  2038: [93.215, 149.413], 2039: [94.826, 153.966], 2040: [96.464, 158.659],
  2041: [98.131, 163.494], 2042: [99.827, 168.477], 2043: [101.552, 173.611],
  2044: [103.307, 178.902], 2045: [105.092, 184.355]
};

const PARCEL_FIELDS = [
  'Height_Ft', 'Area_1000', 'Env_1000_Area_Height', 'Bldg_SqFt_1000',
  'Res_Dummy', 'Historic', 'SDB_2016_5Plus',
  'zp_OfficeComm', 'zp_DRMulti_RTO', 'zp_FBDMulti_RTO', 'zp_PDRInd',
  'zp_Public', 'zp_Redev', 'zp_RH2', 'zp_RH3_RM1',
  'DIST_SBayshore', 'DIST_BernalHts', 'DIST_Scentral', 'DIST_Central',
  'DIST_BuenaVista', 'DIST_Northeast', 'DIST_WestAddition', 'DIST_SOMA',
  'DIST_InnerSunset', 'DIST_Richmond', 'DIST_Ingleside', 'DIST_OuterSunset',
  'DIST_Marina', 'DIST_Mission'
];

const MODEL_COLS = [...PARCEL_FIELDS, 'SDB_2016_5Plus_EnvFull', 'Zoning_DR_EnvFull'];

function getTransferTaxRate(value) {
  if (value >= 25000000) return 0.06;
  if (value >= 10000000) return 0.055;
  if (value >= 5000000) return 0.0225;
  if (value >= 1000000) return 0.0075;
  if (value >= 250001) return 0.0068;
  return 0.005;
}

function buildMacroScenarios(cost) {
  const macro = {};
  for (let y = 2026; y <= 2045; y++) {
    macro[y] = { costs: cost, priceLow: PRICES[y][0], priceHigh: PRICES[y][1] };
  }
  return macro;
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function calcAnnualProb(parcel, year, scenario, macro) {
  const m = macro[year];
  const price = scenario === 'high' ? m.priceHigh : m.priceLow;
  let z = PROB_WEIGHTS.Intercept + PROB_WEIGHTS.Const_Costs_Real * m.costs + PROB_WEIGHTS.Zillow_Price_Real * price;
  for (const f of PARCEL_FIELDS) z += PROB_WEIGHTS[f] * (parcel[f] || 0);
  return sigmoid(z);
}

function calc20YearProb(parcel, scenario, macro) {
  let pNot = 1.0;
  for (let y = 2026; y <= 2045; y++) pNot *= (1 - calcAnnualProb(parcel, y, scenario, macro));
  return 1 - pNot;
}

function calcUnits(parcel) {
  let u = UNITS_WEIGHTS.Intercept;
  u += UNITS_WEIGHTS.Env_1000_Area_Height * (parcel.Env_1000_Area_Height || 0);
  u += UNITS_WEIGHTS.SDB_2016_5Plus_EnvFull * (parcel.SDB_2016_5Plus_EnvFull || 0);
  u += UNITS_WEIGHTS.Zoning_DR_EnvFull * (parcel.Zoning_DR_EnvFull || 0);
  return Math.max(0, u);
}

function calcExpected(parcel, scenario, macro) {
  return calc20YearProb(parcel, scenario, macro) * calcUnits(parcel);
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i]);
    return obj;
  });
}

// Load expected values and aggregate by mapblklot
const expectedValuesPath = process.argv[2] || join(projectRoot, 'sf_all_parcels_expected_values_v4.csv');
console.log('Loading expected values from:', expectedValuesPath);

const valuesText = readFileSync(expectedValuesPath, 'utf-8');
const valuesRows = parseCSV(valuesText);

const mapblklotValues = new Map();
for (const row of valuesRows) {
  const mapblklot = row.parcel_number.substring(0, 7);
  const value = parseFloat(row.expected_value) || 0;
  mapblklotValues.set(mapblklot, (mapblklotValues.get(mapblklot) || 0) + value);
}
console.log(`Aggregated ${valuesRows.length} blklots into ${mapblklotValues.size} mapblklots`);

// Load model data and calculate adjusted costs
const modelText = readFileSync(join(projectRoot, 'public/data/parcels-model.csv'), 'utf-8');
const modelRows = parseCSV(modelText);
const parcels = [];

for (const row of modelRows) {
  const p = { BlockLot: row.BlockLot };
  for (const c of MODEL_COLS) p[c] = parseFloat(row[c]) || 0;

  const totalValue = mapblklotValues.get(row.BlockLot) || 0;
  const taxRate = getTransferTaxRate(totalValue);
  p.adjustedCost = BASE_COST * (1 - taxRate * MULTIPLIER);

  parcels.push(p);
}

// Calculate totals
const MACRO_ORIGINAL = buildMacroScenarios(BASE_COST);

let origLow = 0, origHigh = 0, dynLow = 0, dynHigh = 0;
for (const p of parcels) {
  const macroDyn = buildMacroScenarios(p.adjustedCost);
  origLow += calcExpected(p, 'low', MACRO_ORIGINAL);
  origHigh += calcExpected(p, 'high', MACRO_ORIGINAL);
  dynLow += calcExpected(p, 'low', macroDyn);
  dynHigh += calcExpected(p, 'high', macroDyn);
}

console.log('');
console.log('=== Results ===');
console.log('');
console.log('Original (no reform):');
console.log(`  Low:  ${Math.round(origLow)} units`);
console.log(`  High: ${Math.round(origHigh)} units`);
console.log('');
console.log('With Transfer Tax Reform:');
console.log(`  Low:  ${Math.round(dynLow)} units`);
console.log(`  High: ${Math.round(dynHigh)} units`);
console.log('');
console.log('Difference:');
console.log(`  Low:  +${Math.round(dynLow - origLow)} units (+${((dynLow - origLow) / origLow * 100).toFixed(1)}%)`);
console.log(`  High: +${Math.round(dynHigh - origHigh)} units (+${((dynHigh - origHigh) / origHigh * 100).toFixed(1)}%)`);
