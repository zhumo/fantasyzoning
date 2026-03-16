#!/usr/bin/env python3
"""Step 15: Remove shipyard parcels (missing zoning and height in Bayview)"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

from lib.io import read_csv, write_csv, copy_to_next_step


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    initial_count = len(df)

    missing_zoning = df['zoning_code'].isna() | (df['zoning_code'] == '')
    missing_height = df['Height_Ft'].isna() | (df['Height_Ft'] == '')
    is_bayview = df['analysis_neighborhood'] == 'Bayview Hunters Point'

    shipyard_mask = missing_zoning & missing_height & is_bayview
    removed = shipyard_mask.sum()

    result = df[~shipyard_mask]

    write_csv(result, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(result), 'removed': removed}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (removed {r['removed']:,})")
