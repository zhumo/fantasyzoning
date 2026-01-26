#!/usr/bin/env python3
"""Step 11: Fill zp_* zoning category columns"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

import pandas as pd

from lib.io import read_csv, write_csv, copy_to_next_step

ZP_MAPPING = {
    'zp_RH2': ['RH-2'],
    'zp_RH3_RM1': ['RH-3', 'RM-1'],
    'zp_OfficeComm': [
        'C-2', 'C-3-G', 'C-3-O', 'C-3-O(SD)', 'C-3-R', 'C-3-S', 'C-M', 'CMUO', 'MUO', 'WMUO',
    ],
    'zp_DRMulti_RTO': [
        'NC-1', 'NC-2', 'NC-3', 'NC-S', 'RC-3', 'RC-4', 'RM-2', 'RM-3', 'RM-4', 'RSD', 'SLR', 'SSO',
        'NCD', 'NCD-24TH-MISSION', 'NCD-24TH-NOE-VALLEY', 'NCD-BROADWAY', 'NCD-CASTRO', 'NCD-COLE VALLEY',
        'NCD-CORTLAND AVENUE', 'NCD-EXCELSIOR OUTER MISSION', 'NCD-FILLMORE', 'NCD-GEARY BOULEVARD',
        'NCD-HAIGHT', 'NCD-HAYES', 'NCD-INNER BALBOA STREET', 'NCD-INNER CLEMENT', 'NCD-INNER SUNSET',
        'NCD-INNER TARAVAL STREET', 'NCD-IRVING', 'NCD-JAPANTOWN', 'NCD-JUDAH', 'NCD-LAKESIDE VILLAGE',
        'NCD-LOWER HAIGHT STREET', 'NCD-LOWER POLK STREET', 'NCD-MISSION BERNAL', 'NCD-NORIEGA',
        'NCD-NORTH BEACH', 'NCD-OUTER BALBOA STREET', 'NCD-OUTER CLEMENT', 'NCD-PACIFIC', 'NCD-POLK',
        'NCD-SACRAMENTO', 'NCD-SAN BRUNO AVENUE', 'NCD-TARAVAL', 'NCD-UNION', 'NCD-UPPER FILLMORE',
        'NCD-UPPER MARKET', 'NCD-VALENCIA', 'NCD-WEST PORTAL', 'NCD-BAYVIEW',
    ],
    'zp_FBDMulti_RTO': [
        'NCT', 'NCT-1', 'NCT-2', 'NCT-3', 'NCT-DIVISADERO', 'NCT-FOLSOM', 'NCT-GLEN PARK', 'NCT-HAYES',
        'NCT-MISSION', 'NCT-OCEAN', 'NCT-SOMA', 'NCT-UPPER MARKET',
        'RTO', 'RTO-1', 'RTO-C', 'RTO-M',
        'DTR', 'MUR', 'MUG', 'RCD', 'RED', 'RED-MX', 'RH DTR', 'SB-DTR', 'SPD', 'TB DTR', 'UMU', 'WMUG',
        'PM-MU1', 'PM-MU2', 'PM-R', 'P70-MU', 'MR-MU',
    ],
    'zp_PDRInd': [
        'M-1', 'M-2', 'PDR-1', 'PDR-1-B', 'PDR-1-D', 'PDR-1-G', 'PDR-2', 'SALI', 'SLI',
    ],
    'zp_Public': ['P', 'PM-CF', 'PM-OS', 'MB-O', 'MB-OS'],
    'zp_Redev': ['HP-RA', 'MB-RA', 'MISS BAY N RED', 'MISS BAY S RED', 'MISS BAY S PLN'],
}

CODE_TO_ZP = {}
for zp_col, codes in ZP_MAPPING.items():
    for code in codes:
        CODE_TO_ZP[code] = zp_col

ZP_COLS = ['zp_OfficeComm', 'zp_DRMulti_RTO', 'zp_FBDMulti_RTO', 'zp_PDRInd', 'zp_Public', 'zp_Redev', 'zp_RH2', 'zp_RH3_RM1']


def _get_zp_col(planning_code):
    if pd.isna(planning_code):
        return None
    code = planning_code.split(';')[0].strip()
    return CODE_TO_ZP.get(code, None)


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    initial_count = len(df)

    missing_zp_mask = df['zp_RH2'].isna()
    initial_missing = missing_zp_mask.sum()

    for col in ZP_COLS:
        df.loc[missing_zp_mask, col] = '0'

    for idx in df[missing_zp_mask].index:
        planning_code = df.loc[idx, 'FZP Planning Code']
        zp_col = _get_zp_col(planning_code)
        if zp_col:
            df.loc[idx, zp_col] = '1'

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'filled': initial_missing}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (filled {r['filled']:,})")
