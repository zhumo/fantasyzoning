#!/usr/bin/env python3
"""Step 07: Fill missing district flags"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

from lib.io import read_csv, write_csv, copy_to_next_step

PLANNING_TO_DIST = {
    'South Bayshore': 'DIST_SBayshore',
    'Bernal Heights': 'DIST_BernalHts',
    'South Central': 'DIST_Scentral',
    'Central': 'DIST_Central',
    'Buena Vista': 'DIST_BuenaVista',
    'Northeast': 'DIST_Northeast',
    'Western Addition': 'DIST_WestAddition',
    'South of Market': 'DIST_SOMA',
    'Inner Sunset': 'DIST_InnerSunset',
    'Richmond': 'DIST_Richmond',
    'Ingleside': 'DIST_Ingleside',
    'Outer Sunset': 'DIST_OuterSunset',
    'Marina': 'DIST_Marina',
    'Mission': 'DIST_Mission',
}


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    initial_count = len(df)

    dist_cols = [c for c in df.columns if c.startswith('DIST_')]
    missing_dist_mask = df[dist_cols[0]].isna()
    initial_missing = missing_dist_mask.sum()

    for col in dist_cols:
        df.loc[missing_dist_mask, col] = '0'

    for district, col in PLANNING_TO_DIST.items():
        mask = missing_dist_mask & (df['planning_district'] == district)
        df.loc[mask, col] = '1'

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'filled': initial_missing}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (filled {r['filled']:,})")
