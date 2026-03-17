import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ParcelCalculator } from '../../src/calculators/parcelCalculator';
import { MACRO_SCENARIOS } from '../../src/data/macroScenarios';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../..');

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

function createMacroScenariosWithCost(customCost) {
  const modified = {};
  for (const year in MACRO_SCENARIOS) {
    modified[year] = {
      ...MACRO_SCENARIOS[year],
      construction_costs: customCost
    };
  }
  return modified;
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

export function runAnalysis(adjustedCostsPath) {
  const costsText = readFileSync(adjustedCostsPath, 'utf-8');
  const costsRows = parseCSV(costsText);

  const mapblklotCosts = new Map();
  for (const row of costsRows) {
    mapblklotCosts.set(row.mapblklot, parseFloat(row.adjusted_construction_cost));
  }
  console.error(`Loaded adjusted costs for ${mapblklotCosts.size} mapblklots`);

  const modelText = readFileSync(join(projectRoot, 'public/data/parcels-model.csv'), 'utf-8');
  const modelRows = parseCSV(modelText);

  let origLow = 0, origHigh = 0, dynLow = 0, dynHigh = 0;

  for (const row of modelRows) {
    const parcelData = { BlockLot: row.BlockLot };
    for (const c of MODEL_COLS) parcelData[c] = parseFloat(row[c]) || 0;

    const origCalc = new ParcelCalculator(parcelData);
    origLow += origCalc.getExpectedUnitsLow() || 0;
    origHigh += origCalc.getExpectedUnitsHigh() || 0;

    const adjustedCost = mapblklotCosts.get(row.BlockLot);
    if (adjustedCost) {
      const adjustedMacro = createMacroScenariosWithCost(adjustedCost);
      const dynCalc = new ParcelCalculator(parcelData, adjustedMacro);
      dynLow += dynCalc.getExpectedUnitsLow() || 0;
      dynHigh += dynCalc.getExpectedUnitsHigh() || 0;
    } else {
      dynLow += origCalc.getExpectedUnitsLow() || 0;
      dynHigh += origCalc.getExpectedUnitsHigh() || 0;
    }
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

{
  const adjustedCostsPath = process.argv[2];
  if (!adjustedCostsPath) {
    console.error('Usage: npx vite-node calculate-expected-units.mjs <adjusted-costs.csv>');
    process.exit(1);
  }
  const results = runAnalysis(adjustedCostsPath);
  console.log(JSON.stringify(results));
}
