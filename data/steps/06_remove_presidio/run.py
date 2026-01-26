#!/usr/bin/env python3
"""Step 06: Remove Presidio parcels"""
import sys
from pathlib import Path
STEP_DIR = Path(__file__).parent
sys.path.insert(0, str(STEP_DIR.parent.parent))

from lib.io import read_csv, write_csv, copy_to_next_step


def run():
    df = read_csv(STEP_DIR / 'input.csv')
    initial_count = len(df)

    result = df[df['planning_district'] != 'Presidio']

    write_csv(result, STEP_DIR / 'output.csv')
    copy_to_next_step(STEP_DIR)

    removed = initial_count - len(result)
    return {'input': initial_count, 'output': len(result), 'removed': removed}


if __name__ == '__main__':
    r = run()
    print(f"[{STEP_DIR.name}] {r['input']:,} -> {r['output']:,} (removed {r['removed']:,})")
