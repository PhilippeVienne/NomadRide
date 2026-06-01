# French Fuel Prices API (Flux Instantané)

- **Source**: Ministère de l'Économie, des Finances et de la Souveraineté industrielle et numérique.
- **URL**: `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/json`
- **Geographical Coverage**: France (Mainland + DOM-TOM).
- **Update Frequency**: Real-time (flux instantané).
- **License**: Open License (Etalab).

## Data Schema (Simplified)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | number | Station ID |
| `latitude` | string | Latitude |
| `longitude` | string | Longitude |
| `adresse` | string | Street Address |
| `ville` | string | City |
| `sp98_prix` | number | Price of SP98 (Euro) |
| `sp98_maj` | string | Last update timestamp for SP98 |
| `services_service` | string | Services available (e.g., "Toilettes, Boutique") |

## Implementation Notes

- **Caching**: The full export is large. Store it in the project database (PostgreSQL) and refresh every 1-2 hours.
- **Filtering**: Use spatial queries (PostGIS if available) or Haversine formula for "nearby" searches.
