#!/usr/bin/env python3
"""
Data pipeline for SF rezoning analysis.

Transforms raw parcel data into model-ready outputs:
- parcels.geojson: Parcel geometries
- parcels-overlay.csv: Parcel attributes for UI tooltip
- parcels-model.csv: Model features for unit calculation

Usage:
    python run_pipeline.py
"""

import shutil
import importlib.util
from pathlib import Path

from lib.paths import STEPS_DIR, INPUT_FILES


def get_steps():
    steps = []
    for d in sorted(STEPS_DIR.iterdir()):
        if d.is_dir() and d.name[0:2].isdigit():
            run_file = d / 'run.py'
            if run_file.exists():
                steps.append(d)
    return steps


def load_step_module(step_dir):
    run_file = step_dir / 'run.py'
    spec = importlib.util.spec_from_file_location(f"step_{step_dir.name}", run_file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_pipeline():
    steps = get_steps()

    print(f"Pipeline has {len(steps)} steps")
    print()

    first_step = steps[0]
    print(f"Copying source data to {first_step.name}/input.csv...")
    shutil.copy(INPUT_FILES['parcels'], first_step / 'input.csv')

    for step_dir in steps:
        module = load_step_module(step_dir)
        result = module.run()

        step_name = step_dir.name
        input_count = result.get('input', 0)
        output_count = result.get('output', 0)

        extras = []
        for key in ['filled', 'imputed', 'computed', 'removed', 'missing']:
            if key in result and result[key] > 0:
                extras.append(f"{key} {result[key]:,}")

        extra_str = f" ({', '.join(extras)})" if extras else ""
        print(f"[{step_name}] {input_count:,} -> {output_count:,}{extra_str}")

        if 'total_low' in result and 'total_high' in result:
            print(f"  Total expected units (low): {result['total_low']:,.0f}")
            print(f"  Total expected units (high): {result['total_high']:,.0f}")

    final_count = result.get('output', 0)
    print()
    print(f"Pipeline complete: {final_count:,} parcels")


if __name__ == '__main__':
    run_pipeline()
