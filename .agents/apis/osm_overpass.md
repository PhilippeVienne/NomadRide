# OpenStreetMap Overpass API — Fuel Station Brand Lookup

## Purpose
Used to enrich fuel station data with real brand names. The French government fuel API (`data.economie.gouv.fr`) does not include brand information.

## API Details

| Field | Value |
|---|---|
| **Endpoint** | `https://overpass-api.de/api/interpreter` |
| **Method** | `POST` |
| **Authentication** | None required (free, public API) |
| **Rate Limits** | Soft limits — avoid more than 1 req/sec. We cache aggressively. |
| **Content-Type** | `application/x-www-form-urlencoded` |

## Query Format (Overpass QL)

```
[out:json][timeout:15];
nwr["amenity"="fuel"](around:{radiusMeters},{lat},{lon});
out center tags;
```

- `nwr` = nodes, ways, relations (fuel stations can be mapped as any of these)
- `around:{meters},{lat},{lon}` = circular search area
- `out center tags` = return center coordinates and OSM tags (including `brand`)

## Relevant OSM Tags

| Tag | Description |
|---|---|
| `brand` | Official brand name (e.g., "TotalEnergies", "Shell") |
| `operator` | Operator company (fallback if no brand) |
| `name` | Station name (last fallback) |

## Integration

- **File**: `backend/src/services/osmService.ts`
- **Cache**: In-memory, 6-hour TTL, keyed by grid-tile (~5km grid)
- **Matching**: Haversine distance, max 150m tolerance between government API coords and OSM coords
- **Enrichment**: Batch call per search area, not per station

## Example Response Element

```json
{
  "type": "node",
  "id": 12345,
  "lat": 45.8234,
  "lon": 4.8567,
  "tags": {
    "amenity": "fuel",
    "brand": "TotalEnergies",
    "brand:wikidata": "Q154037",
    "name": "TotalEnergies",
    "operator": "TotalEnergies"
  }
}
```
