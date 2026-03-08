import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ParcelCalculator, MACRO_SCENARIOS } from '../../src/parcelCalculator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

const BASE_COST = 112.723;
const MULTIPLIER = 2;

const MODEL_COLS = [
  'Height_Ft', 'Area_1000', 'Env_1000_Area_Height', 'Bldg_SqFt_1000',
  'Res_Dummy', 'Historic', 'SDB_2016_5Plus',
  'zp_OfficeComm', 'zp_DRMulti_RTO', 'zp_FBDMulti_RTO', 'zp_PDRInd',
  'zp_Public', 'zp_Redev', 'zp_RH2', 'zp_RH3_RM1',
  'DIST_SBayshore', 'DIST_BernalHts', 'DIST_Scentral', 'DIST_Central',
  'DIST_BuenaVista', 'DIST_Northeast', 'DIST_WestAddition', 'DIST_SOMA',
  'DIST_InnerSunset', 'DIST_Richmond', 'DIST_Ingleside', 'DIST_OuterSunset',
  'DIST_Marina', 'DIST_Mission',
  'SDB_2016_5Plus_EnvFull', 'Zoning_DR_EnvFull'
];

function getTransferTaxRate(value) {
  if (value >= 25000000) return 0.06;
  if (value >= 10000000) return 0.055;
  if (value >= 5000000) return 0.0225;
  if (value >= 1000000) return 0.0075;
  if (value >= 250001) return 0.0068;
  return 0.005;
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

export function runAnalysis(expectedValuesPath) {
  const valuesText = readFileSync(expectedValuesPath, 'utf-8');
  const valuesRows = parseCSV(valuesText);

  const mapblklotValues = new Map();
  for (const row of valuesRows) {
    const mapblklot = row.parcel_number.substring(0, 7);
    const value = parseFloat(row.expected_value) || 0;
    mapblklotValues.set(mapblklot, (mapblklotValues.get(mapblklot) || 0) + value);
  }
  console.log(`Aggregated ${valuesRows.length} blklots into ${mapblklotValues.size} mapblklots`);

  const modelText = readFileSync(join(projectRoot, 'public/data/parcels-model.csv'), 'utf-8');
  const modelRows = parseCSV(modelText);

  let origLow = 0, origHigh = 0, dynLow = 0, dynHigh = 0;

  for (const row of modelRows) {
    const parcelData = { BlockLot: row.BlockLot };
    for (const c of MODEL_COLS) parcelData[c] = parseFloat(row[c]) || 0;

    const calc = new ParcelCalculator(parcelData);

    origLow += calc.getExpectedUnitsLow() || 0;
    origHigh += calc.getExpectedUnitsHigh() || 0;

    const totalValue = mapblklotValues.get(row.BlockLot) || 0;
    const taxRate = getTransferTaxRate(totalValue);
    const adjustedCost = BASE_COST * (1 - taxRate * MULTIPLIER);

    dynLow += calc.getExpectedUnitsWithCost('low', adjustedCost) || 0;
    dynHigh += calc.getExpectedUnitsWithCost('high', adjustedCost) || 0;
  }

  return {
    original: { low: Math.round(origLow), high: Math.round(origHigh) },
    withReform: { low: Math.round(dynLow), high: Math.round(dynHigh) },
    difference: {
      low: Math.round(dynLow - origLow),
      high: Math.round(dynHigh - origHigh),
      lowPct: ((dynLow - origLow) / origLow * 100).toFixed(1),
      highPct: ((dynHigh - origHigh) / origHigh * 100).toFixed(1)
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const expectedValuesPath = process.argv[2] || join(projectRoot, 'sf_all_parcels_expected_values_v4.csv');
  console.log('Loading expected values from:', expectedValuesPath);

  const results = runAnalysis(expectedValuesPath);

  console.log('');
  console.log('=== Results ===');
  console.log('');
  console.log('Original (no reform):');
  console.log(`  Low:  ${results.original.low} units`);
  console.log(`  High: ${results.original.high} units`);
  console.log('');
  console.log('With Transfer Tax Reform:');
  console.log(`  Low:  ${results.withReform.low} units`);
  console.log(`  High: ${results.withReform.high} units`);
  console.log('');
  console.log('Difference:');
  console.log(`  Low:  +${results.difference.low} units (+${results.difference.lowPct}%)`);
  console.log(`  High: +${results.difference.high} units (+${results.difference.highPct}%)`);
}
