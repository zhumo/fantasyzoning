# TODO

## Data Pipeline

- [ ] Pre-compute `distance_to_transit` in Python pipeline instead of calculating client-side in MapView.vue. Currently calculates centroid and haversine distance for ~150k parcels on every page load.
