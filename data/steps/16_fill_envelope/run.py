#!/usr/bin/env python3
"""Step 16: Fill envelope (Env_1000_Area_Height)"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

from lib.io import read_csv, write_csv, copy_to_next_step


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    initial_count = len(df)

    missing_env_mask = df['Env_1000_Area_Height'].isna()
    initial_missing = missing_env_mask.sum()

    area_numeric = df.loc[missing_env_mask, 'Area_1000'].str.replace(',', '').astype(float)
    height_numeric = df.loc[missing_env_mask, 'Height_Ft'].str.replace(',', '').astype(float)
    df.loc[missing_env_mask, 'Env_1000_Area_Height'] = (area_numeric * height_numeric / 10).astype(str)

    write_csv(df, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(df), 'filled': initial_missing}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (filled {r['filled']:,})")
