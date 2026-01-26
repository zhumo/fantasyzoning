#!/usr/bin/env python3
"""Step 08: Fill Res_Dummy from land use data"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

from lib.io import read_csv, write_csv, copy_to_next_step
from lib.paths import INPUT_FILES


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    land_use_df = read_csv(INPUT_FILES['land_use'])
    initial_count = len(df)

    missing_res_dummy_mask = df['Res_Dummy'].isna()
    initial_missing = missing_res_dummy_mask.sum()

    land_use_lookup = land_use_df.set_index('mapblklot')['resunits'].to_dict()

    df.loc[missing_res_dummy_mask, 'Res_Units'] = df.loc[missing_res_dummy_mask, 'mapblklot'].map(land_use_lookup)

    res_units_numeric = df.loc[missing_res_dummy_mask, 'Res_Units'].str.replace(',', '').astype(float)
    df.loc[missing_res_dummy_mask, 'Res_Dummy'] = (res_units_numeric > 0).astype(int).astype(str)

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'filled': initial_missing}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (filled {r['filled']:,})")
