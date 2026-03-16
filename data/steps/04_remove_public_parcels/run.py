#!/usr/bin/env python3
"""Step 04: Remove public parcels"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

from lib.io import read_csv, read_geojson, write_csv, copy_to_next_step
from lib.paths import INPUT_FILES


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    public_parcels_gdf = read_geojson(INPUT_FILES['public_parcels'])
    initial_count = len(df)

    public_mapblklots = set(public_parcels_gdf['mapblklot'])
    result = df[~df['mapblklot'].isin(public_mapblklots)]

    write_csv(result, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    removed = initial_count - len(result)
    return {'input': initial_count, 'output': len(result), 'removed': removed}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (removed {r['removed']:,})")
