#!/usr/bin/env python3
"""Step 03: Merge model data from FZP dataset"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

from lib.io import read_csv, write_csv, copy_to_next_step
from lib.paths import INPUT_FILES


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    model_df = read_csv(INPUT_FILES['model'])
    raw_parcels_df = read_csv(INPUT_FILES['parcels'])
    initial_count = len(df)

    blklot_to_mapblklot = raw_parcels_df.set_index('blklot')['mapblklot'].to_dict()
    parcels_blklots = set(raw_parcels_df['blklot'])

    model_df_filtered = model_df[model_df['BlockLot'].isin(parcels_blklots)].copy()
    model_df_filtered['mapblklot'] = model_df_filtered['BlockLot'].map(blklot_to_mapblklot)

    model_cols = [c for c in model_df_filtered.columns if c not in ['BlockLot']]
    model_by_mapblklot = model_df_filtered.drop_duplicates(subset='mapblklot', keep='first')[model_cols]

    result = df.merge(model_by_mapblklot, on='mapblklot', how='left')

    has_model_data = result['mapblklot'].isin(model_by_mapblklot['mapblklot'])
    is_active = result['active'] == 'true'
    keep_mask = has_model_data | is_active

    result = result[keep_mask]

    write_csv(result, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    return {'input': initial_count, 'output': len(result)}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,}")
