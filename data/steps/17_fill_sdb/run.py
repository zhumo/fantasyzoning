#!/usr/bin/env python3
"""Step 17: Fill SDB (State Density Bonus) columns"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

import pandas as pd

from lib.io import read_csv, write_csv, write_exception, copy_to_next_step

SDB_COLS = ['SDB_2016_5Plus', 'SDB_2016_5Plus_EnvFull', 'Zoning_DR_EnvFull']
SDB_ENVELOPE_THRESHOLD = 9.0
SDB_HEIGHT_CAP = 130


def _compute_sdb_qualification(df):
    envelope = pd.to_numeric(df['Env_1000_Area_Height'], errors='coerce').fillna(0)
    height = pd.to_numeric(df['Height_Ft'], errors='coerce').fillna(0)

    qualifies = (
        (envelope > SDB_ENVELOPE_THRESHOLD) &
        (height <= SDB_HEIGHT_CAP)
    )
    return qualifies.astype(int).astype(str)


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    initial_count = len(df)

    missing_sdb_mask = df['SDB_2016_5Plus'].isna() | (df['SDB_2016_5Plus'] == '')
    initial_missing = missing_sdb_mask.sum()
    computed_count = 0

    if missing_sdb_mask.any():
        computed_sdb = _compute_sdb_qualification(df)
        df.loc[missing_sdb_mask, 'SDB_2016_5Plus'] = computed_sdb[missing_sdb_mask]

        envelope = pd.to_numeric(df['Env_1000_Area_Height'], errors='coerce').fillna(0)
        sdb_env_full = (computed_sdb == '1').astype(float) * envelope
        df.loc[missing_sdb_mask, 'SDB_2016_5Plus_EnvFull'] = sdb_env_full[missing_sdb_mask].astype(str)

        computed_count = missing_sdb_mask.sum()

        if computed_count > 0:
            write_exception(
                df[missing_sdb_mask][['mapblklot', 'analysis_neighborhood', 'SDB_2016_5Plus', 'Env_1000_Area_Height']],
                '17-fill-sdb-computed.csv'
            )

    for col in SDB_COLS:
        still_missing = df[col].isna() | (df[col] == '')
        df.loc[still_missing, col] = '0'

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'computed': computed_count}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (computed {r['computed']:,})")
