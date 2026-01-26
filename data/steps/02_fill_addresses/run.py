#!/usr/bin/env python3
"""Step 02: Fill missing addresses from land use data"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

from lib.io import read_csv, write_csv, write_exception, copy_to_next_step
from lib.paths import INPUT_FILES


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    land_use_df = read_csv(INPUT_FILES['land_use'])
    initial_count = len(df)

    missing_mask = df['from_address_num'].isna() | (df['from_address_num'] == '')
    initial_missing = missing_mask.sum()

    address_lookup = land_use_df.set_index('mapblklot')[['from_st', 'street', 'st_type']].to_dict('index')

    for idx in df[missing_mask].index:
        mapblklot = df.loc[idx, 'mapblklot']
        if mapblklot in address_lookup:
            addr = address_lookup[mapblklot]
            df.loc[idx, 'from_address_num'] = addr['from_st']
            df.loc[idx, 'street_name'] = addr['street']
            df.loc[idx, 'street_type'] = addr['st_type']

    still_missing_mask = df['from_address_num'].isna() | (df['from_address_num'] == '')
    still_missing = still_missing_mask.sum()
    filled = initial_missing - still_missing

    if still_missing > 0:
        write_exception(
            df[still_missing_mask][['mapblklot', 'analysis_neighborhood']],
            '02-fill-addresses-still-missing.csv'
        )

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'filled': filled, 'missing': still_missing}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (filled {r['filled']:,}, still missing {r['missing']:,})")
