import pandas as pd
import geopandas as gpd
from shapely import wkt


def fill_height_from_spatial_join(parcels_df, height_bulk_gdf):
    result = parcels_df.copy()

    missing_height_mask = result['Height_Ft'].isna()

    if missing_height_mask.sum() == 0:
        return result

    missing_parcels = result[missing_height_mask].copy()
    missing_parcels['geometry'] = missing_parcels['shape'].apply(wkt.loads)
    missing_gdf = gpd.GeoDataFrame(missing_parcels, geometry='geometry', crs='EPSG:4326')

    missing_gdf_projected = missing_gdf.to_crs('EPSG:2227')
    missing_gdf['centroid'] = missing_gdf_projected.geometry.centroid.to_crs('EPSG:4326')

    centroid_gdf = missing_gdf.set_geometry('centroid')
    joined = gpd.sjoin(centroid_gdf, height_bulk_gdf[['geometry', 'gen_hght']], how='left', predicate='within')

    height_lookup = joined.set_index(joined.index)['gen_hght'].to_dict()
    result.loc[missing_height_mask, 'Height_Ft'] = result.loc[missing_height_mask].index.map(height_lookup)

    return result


def remove_open_space_parcels(parcels_df, public_parcels_path):
    result = parcels_df.copy()

    height_numeric = result['Height_Ft'].str.replace(',', '').astype(float)
    open_space_mask = height_numeric >= 1000

    if open_space_mask.sum() == 0:
        return result, None

    open_space_parcels = result[open_space_mask].copy()
    open_space_parcels['geometry'] = open_space_parcels['shape'].apply(wkt.loads)
    open_space_gdf = gpd.GeoDataFrame(open_space_parcels, geometry='geometry', crs='EPSG:4326')

    existing_public = gpd.read_file(public_parcels_path)
    existing_mapblklots = set(existing_public['mapblklot'])

    new_public = open_space_gdf[~open_space_gdf['mapblklot'].isin(existing_mapblklots)]

    if len(new_public) > 0:
        cols_to_keep = [c for c in existing_public.columns if c in new_public.columns]
        new_public_subset = new_public[cols_to_keep]

        combined = pd.concat([existing_public, new_public_subset], ignore_index=True)
        combined.to_file(public_parcels_path, driver='GeoJSON')
        updated_public = combined
    else:
        updated_public = existing_public

    result = result[~open_space_mask]

    return result, updated_public
