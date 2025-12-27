import geopandas as gpd
from shapely import wkt


def fill_missing_area(parcels_df):
    result = parcels_df.copy()

    missing_area_mask = result['Shape_Area_SqFt'].isna()

    missing_gdf = gpd.GeoDataFrame(
        result[missing_area_mask],
        geometry=result.loc[missing_area_mask, 'shape'].apply(wkt.loads),
        crs='EPSG:4326'
    ).to_crs('EPSG:2227')

    area_lookup = missing_gdf.geometry.area.to_dict()
    result.loc[missing_area_mask, 'Shape_Area_SqFt'] = result.loc[missing_area_mask].index.map(area_lookup).astype(str)

    result['Shape_Area_SqFt_numeric'] = result['Shape_Area_SqFt'].str.replace(',', '').astype(float)

    missing_area_1000_mask = result['Area_1000'].isna()
    result.loc[missing_area_1000_mask, 'Area_1000'] = (result.loc[missing_area_1000_mask, 'Shape_Area_SqFt_numeric'] / 1000).astype(str)

    result = result.drop(columns=['Shape_Area_SqFt_numeric'])

    return result
