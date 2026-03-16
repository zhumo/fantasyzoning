#!/usr/bin/env python3
"""Step 01: Deduplicate parcels by mapblklot"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

from lib.io import read_csv, write_csv, copy_to_next_step


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    initial_count = len(df)

    blklots_agg = df.groupby('mapblklot')['blklot'].apply(lambda x: ','.join(sorted(x))).reset_index()
    blklots_agg.columns = ['mapblklot', 'blklots']

    result = df.drop_duplicates(subset='mapblklot', keep='first')
    result = result.drop(columns=['blklot', 'block_num', 'lot_num'])
    result = result.merge(blklots_agg, on='mapblklot')

    cols = result.columns.tolist()
    cols.remove('blklots')
    cols.insert(1, 'blklots')
    result = result[cols]

    write_csv(result, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(result)}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,}")
