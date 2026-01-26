#!/usr/bin/env python3
"""Step 09: Fill building sqft from land use data"""
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

    missing_sqft_mask = df['Tot_Existing_SqFt'].isna()
    initial_missing = missing_sqft_mask.sum()

    res_lookup = land_use_df.set_index('mapblklot')['res'].to_dict()

    df.loc[missing_sqft_mask, 'Tot_Existing_SqFt'] = df.loc[missing_sqft_mask, 'mapblklot'].map(res_lookup)
    df.loc[missing_sqft_mask, 'Tot_Existing_SqFt'] = df.loc[missing_sqft_mask, 'Tot_Existing_SqFt'].str.replace(',', '').astype(float)
    df.loc[missing_sqft_mask, 'Bldg_SqFt_1000'] = df.loc[missing_sqft_mask, 'Tot_Existing_SqFt'] / 1000

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'filled': initial_missing}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (filled {r['filled']:,})")
