from pathlib import Path

DATA_DIR = Path(__file__).parent.parent
STEPS_DIR = DATA_DIR / 'steps'
INPUT_DIR = DATA_DIR / 'input'
OUTPUT_DIR = DATA_DIR / 'output'
EXCEPTIONS_DIR = OUTPUT_DIR / 'exceptions'
PUBLIC_DIR = DATA_DIR.parent / 'public' / 'data'

INPUT_FILES = {
    'parcels': DATA_DIR / 'active-and-retired-parcels.csv',
    'model': INPUT_DIR / 'parcels-w-fzp-model-data.csv',
    'land_use': INPUT_DIR / 'land-use.csv',
    'zoning_district': INPUT_DIR / 'zoning-district.csv',
    'height_bulk': INPUT_DIR / 'height-and-bulk-districts.csv',
    'historic_districts': INPUT_DIR / 'historic-districts.csv',
    'public_parcels': PUBLIC_DIR / 'public-parcels.geojson',
    'transit_bart': PUBLIC_DIR / 'transit-bart.geojson',
    'transit_muni': PUBLIC_DIR / 'transit-muni.geojson',
    'transit_caltrain': PUBLIC_DIR / 'transit-caltrain.geojson',
}

OUTPUT_FILES = {
    'parcels_geojson': OUTPUT_DIR / 'parcels.geojson',
    'parcels_overlay': OUTPUT_DIR / 'parcels-overlay.csv',
    'parcels_model': OUTPUT_DIR / 'parcels-model.csv',
}
