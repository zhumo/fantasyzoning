"""
SF Residential Parcel Market Value Estimation

This script estimates market values for SF residential parcels using a Gradient Boosting
model trained on recently sold properties from the SF Assessor Historical Secured Property
Tax Rolls dataset.

Methodology: https://gist.github.com/zhumo/9527b2e627ca83e147d8d952277a819a

Usage:
    cd analyses/transfer-tax-reform
    python estimate_market_values.py

Output:
    ../../sf_all_parcels_expected_values_v4.csv
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from pathlib import Path

SOCRATA_URL = "https://data.sfgov.org/resource/wv5m-vpq2.csv"
OUTPUT_PATH = Path(__file__).parent.parent.parent / "sf_all_parcels_expected_values_v4.csv"

NUMERIC_FEATURES = [
    'number_of_bathrooms', 'number_of_bedrooms', 'number_of_rooms',
    'number_of_stories', 'number_of_units', 'lot_area', 'property_area',
    'basement_area', 'lot_depth', 'lot_frontage', 'building_age',
    'percent_of_ownership', 'sqft_per_unit', 'sqft_per_bedroom',
    'has_lot_area', 'beds_imputed', 'rooms_imputed', 'baths_imputed'
]

CATEGORICAL_FEATURES = ['use_cat', 'nbhd_cat', 'zoning_cat', 'construction_cat']

RESIDENTIAL_USES = [
    'Single Family Residential',
    'Multi-Family Residential',
    'Residential Vacant Lot',
    'Residential Misc'
]

EXCLUDED_USES = [
    'Commercial Misc', 'Commercial Retail', 'Commercial Office',
    'Commercial Hotel', 'Industrial', 'Vacant Lot Comm and Ind',
    'Misc', 'Under Water Lot', 'Vacant Street Parcel', 'Vacant Lot'
]


def fetch_data():
    print("Fetching data from SF Open Data...")
    query = f"{SOCRATA_URL}?$where=closed_roll_year='2024'&$limit=300000"
    df = pd.read_csv(query)
    print(f"Loaded {len(df):,} parcels from 2024 tax roll")
    return df


def prepare_training_data(df):
    print("\nPreparing training data...")

    df['current_sales_date'] = pd.to_datetime(df['current_sales_date'], errors='coerce')
    df['sale_year'] = df['current_sales_date'].dt.year
    recent = df[df['current_sales_date'] > '2021-02-08'].copy()
    print(f"  Recent sales (after 2021-02-08): {len(recent):,}")

    recent = recent[recent['sale_year'] < 2024]
    print(f"  Excluding 2024+ sales: {len(recent):,}")

    recent = recent[recent['total_assessed_value'] > 0]
    print(f"  Non-zero assessed value: {len(recent):,}")

    recent = recent[~recent['use_definition'].isin(EXCLUDED_USES)]
    recent = recent[recent['use_definition'].isin(RESIDENTIAL_USES) |
                    recent['use_definition'].str.contains('Residential', na=False)]
    print(f"  Residential only: {len(recent):,}")

    return recent


def build_imputation_tables(df):
    print("\nBuilding imputation lookup tables...")

    df['sqft_bucket'] = (df['property_area'] / 250).round() * 250

    valid_beds = df[df['number_of_bedrooms'] > 0]
    bed_lookup = valid_beds.groupby(['use_definition', 'sqft_bucket'])['number_of_bedrooms'].median()
    bed_fallback = valid_beds.groupby('use_definition')['number_of_bedrooms'].median()

    valid_baths = df[df['number_of_bathrooms'] > 0]
    bath_lookup = valid_baths.groupby(['use_definition', 'sqft_bucket'])['number_of_bathrooms'].median()
    bath_fallback = valid_baths.groupby('use_definition')['number_of_bathrooms'].median()

    valid_rooms = df[df['number_of_rooms'] > 0]
    room_lookup = valid_rooms.groupby(['use_definition', 'sqft_bucket'])['number_of_rooms'].median()
    room_fallback = valid_rooms.groupby('use_definition')['number_of_rooms'].median()

    return {
        'beds': (bed_lookup, bed_fallback),
        'baths': (bath_lookup, bath_fallback),
        'rooms': (room_lookup, room_fallback)
    }


def apply_imputation(df, lookup_tables):
    print("Applying imputation...")
    df = df.copy()
    df['sqft_bucket'] = (df['property_area'] / 250).round() * 250

    df['beds_imputed'] = 0
    df['baths_imputed'] = 0
    df['rooms_imputed'] = 0

    bed_lookup, bed_fallback = lookup_tables['beds']
    bath_lookup, bath_fallback = lookup_tables['baths']
    room_lookup, room_fallback = lookup_tables['rooms']

    for idx in df[df['number_of_bedrooms'] == 0].index:
        use = df.loc[idx, 'use_definition']
        bucket = df.loc[idx, 'sqft_bucket']
        try:
            val = bed_lookup.loc[(use, bucket)]
        except KeyError:
            val = bed_fallback.get(use, 2)
        df.loc[idx, 'number_of_bedrooms'] = val
        df.loc[idx, 'beds_imputed'] = 1

    for idx in df[df['number_of_bathrooms'] == 0].index:
        use = df.loc[idx, 'use_definition']
        bucket = df.loc[idx, 'sqft_bucket']
        try:
            val = bath_lookup.loc[(use, bucket)]
        except KeyError:
            val = bath_fallback.get(use, 1)
        df.loc[idx, 'number_of_bathrooms'] = val
        df.loc[idx, 'baths_imputed'] = 1

    for idx in df[df['number_of_rooms'] == 0].index:
        use = df.loc[idx, 'use_definition']
        bucket = df.loc[idx, 'sqft_bucket']
        try:
            val = room_lookup.loc[(use, bucket)]
        except KeyError:
            val = room_fallback.get(use, 5)
        df.loc[idx, 'number_of_rooms'] = val
        df.loc[idx, 'rooms_imputed'] = 1

    return df


def engineer_features(df):
    print("Engineering features...")
    df = df.copy()

    df['building_age'] = 2024 - df['year_property_built'].fillna(1950)
    df['sqft_per_unit'] = df['property_area'] / df['number_of_units'].replace(0, 1)
    df['sqft_per_bedroom'] = df['property_area'] / df['number_of_bedrooms'].replace(0, 1)
    df['has_lot_area'] = (df['lot_area'] > 0).astype(int)

    df['use_cat'] = df['use_definition'].apply(
        lambda x: x if pd.notna(x) and df['use_definition'].value_counts().get(x, 0) >= 30 else 'Other'
    )
    df['nbhd_cat'] = df['analysis_neighborhood'].apply(
        lambda x: x if pd.notna(x) and df['analysis_neighborhood'].value_counts().get(x, 0) >= 50 else 'Other'
    )
    df['zoning_cat'] = df['zoning_code'].apply(
        lambda x: x if pd.notna(x) and df['zoning_code'].value_counts().get(x, 0) >= 30 else 'Other'
    )
    df['construction_cat'] = df['construction_type'].apply(
        lambda x: x if pd.notna(x) and df['construction_type'].value_counts().get(x, 0) >= 30 else 'Other'
    )

    for col in NUMERIC_FEATURES:
        if col in df.columns:
            df[col] = df[col].fillna(0)

    return df


def train_model(train_df):
    print("\nTraining Gradient Boosting model...")

    X = train_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = np.log1p(train_df['total_assessed_value'])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), NUMERIC_FEATURES),
            ('cat', OneHotEncoder(max_categories=30, handle_unknown='ignore'), CATEGORICAL_FEATURES)
        ]
    )

    model = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', GradientBoostingRegressor(
            n_estimators=500,
            max_depth=7,
            learning_rate=0.08,
            subsample=0.8,
            min_samples_leaf=10,
            random_state=42
        ))
    ])

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_pred_dollars = np.expm1(y_pred)
    y_test_dollars = np.expm1(y_test)

    pct_errors = np.abs(y_pred_dollars - y_test_dollars) / y_test_dollars

    print(f"\n  Model Performance:")
    print(f"    R² (log scale): {model.score(X_test, y_test):.3f}")
    print(f"    Median % error: {np.median(pct_errors)*100:.1f}%")
    print(f"    Within 25%: {(pct_errors < 0.25).mean()*100:.1f}%")
    print(f"    Within 50%: {(pct_errors < 0.50).mean()*100:.1f}%")

    print("\nRetraining on full dataset...")
    model.fit(X, y)

    return model


def predict_all_parcels(df, model, train_df, lookup_tables):
    print("\nPreparing full dataset for prediction...")

    df = df[~df['use_definition'].isin(EXCLUDED_USES)].copy()
    df = df[df['use_definition'].isin(RESIDENTIAL_USES) |
            df['use_definition'].str.contains('Residential', na=False)]
    print(f"  Residential parcels: {len(df):,}")

    df = apply_imputation(df, lookup_tables)
    df = engineer_features(df)

    df['current_sales_date'] = pd.to_datetime(df['current_sales_date'], errors='coerce')
    df['sale_year'] = df['current_sales_date'].dt.year

    recent_mask = (df['sale_year'] >= 2021) & (df['sale_year'] < 2024) & (df['total_assessed_value'] > 0)
    older_mask = ~recent_mask

    print(f"  Recently sold (using actual): {recent_mask.sum():,}")
    print(f"  Older (predicting): {older_mask.sum():,}")

    df['predicted_value'] = np.nan
    df['expected_value'] = np.nan
    df['value_source'] = ''

    df.loc[recent_mask, 'predicted_value'] = df.loc[recent_mask, 'total_assessed_value']
    df.loc[recent_mask, 'expected_value'] = df.loc[recent_mask, 'total_assessed_value']
    df.loc[recent_mask, 'value_source'] = 'actual'

    if older_mask.sum() > 0:
        X_pred = df.loc[older_mask, NUMERIC_FEATURES + CATEGORICAL_FEATURES]
        log_predictions = model.predict(X_pred)
        predictions = np.expm1(log_predictions)
        df.loc[older_mask, 'predicted_value'] = predictions
        df.loc[older_mask, 'expected_value'] = predictions
        df.loc[older_mask, 'value_source'] = 'predicted'

    return df


def save_output(df):
    print(f"\nSaving output to {OUTPUT_PATH}...")

    output_cols = [
        'parcel_number', 'property_location', 'use_definition', 'analysis_neighborhood',
        'zoning_code', 'construction_type', 'year_property_built', 'building_age',
        'number_of_bedrooms', 'number_of_bathrooms', 'number_of_rooms',
        'number_of_stories', 'number_of_units', 'property_area', 'lot_area',
        'basement_area', 'percent_of_ownership', 'current_sales_date',
        'sold_within_5yr', 'assessed_land_value', 'assessed_improvement_value',
        'total_assessed_value', 'predicted_value', 'expected_value', 'value_source',
        'beds_imputed', 'rooms_imputed', 'baths_imputed'
    ]

    df['sold_within_5yr'] = df['sale_year'] >= 2021

    available_cols = [c for c in output_cols if c in df.columns]
    output_df = df[available_cols].copy()

    output_df.to_csv(OUTPUT_PATH, index=False)
    print(f"  Saved {len(output_df):,} parcels")

    return output_df


def main():
    print("=" * 60)
    print("SF Residential Parcel Market Value Estimation")
    print("=" * 60)

    df = fetch_data()

    train_df = prepare_training_data(df)

    lookup_tables = build_imputation_tables(train_df)
    train_df = apply_imputation(train_df, lookup_tables)
    train_df = engineer_features(train_df)

    model = train_model(train_df)

    result_df = predict_all_parcels(df, model, train_df, lookup_tables)

    output_df = save_output(result_df)

    print("\n" + "=" * 60)
    print("Done!")
    print(f"Output: {OUTPUT_PATH}")
    print("=" * 60)

    return output_df


if __name__ == "__main__":
    main()
