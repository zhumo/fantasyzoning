import shutil
from pathlib import Path
import pandas as pd
import geopandas as gpd

from lib.paths import STEPS_DIR, EXCEPTIONS_DIR


def read_csv(path):
    return pd.read_csv(path, dtype=str)


def write_csv(df, path):
    df.to_csv(path, index=False)


def read_geojson(path):
    return gpd.read_file(path)


def write_geojson(gdf, path):
    gdf.to_file(path, driver='GeoJSON')


def csv_to_gdf(df, geometry_col='the_geom', crs='EPSG:4326'):
    return gpd.GeoDataFrame(
        df,
        geometry=gpd.GeoSeries.from_wkt(df[geometry_col]),
        crs=crs
    )


def write_exception(df, filename):
    EXCEPTIONS_DIR.mkdir(parents=True, exist_ok=True)
    path = EXCEPTIONS_DIR / filename
    df.to_csv(path, index=False)
    return path


def get_next_step_dir(step_dir):
    step_name = step_dir.name
    step_num = int(step_name.split('_')[0])
    next_num = step_num + 1

    for d in STEPS_DIR.iterdir():
        if d.is_dir() and d.name.startswith(f'{next_num:02d}_'):
            return d
    return None


def copy_to_next_step(step_dir):
    next_dir = get_next_step_dir(step_dir)
    if next_dir:
        shutil.copy(step_dir / 'output.csv', next_dir / 'input.csv')
        return next_dir
    return None
