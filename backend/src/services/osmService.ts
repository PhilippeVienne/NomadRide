/**
 * OSM Brand Lookup Service
 * 
 * Uses the Overpass API to fetch fuel station brand data from OpenStreetMap.
 * Results are cached per bounding-box tile to avoid redundant network calls.
 * 
 * The Overpass API is free, requires no authentication, and provides rich
 * metadata including the `brand` tag for fuel stations.
 */

const OVERPASS_APIS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

// Geocoding cache
const geocodeCache = new Map<string, { lat: number; lon: number; fetchedAt: number } | null>();
const GEOCODE_CACHE_TTL = 24 * 3600 * 1000; // 24 hours

/**
 * Geocode a search string (city name, postal code) to coordinates using Nominatim.
 * Results are cached for 24 hours.
 */
export async function geocodeSearch(query: string): Promise<{ lat: number; lon: number } | null> {
  const cacheKey = query.toLowerCase();
  const cached = geocodeCache.get(cacheKey);

  if (cached !== undefined && (cached === null || (Date.now() - cached.fetchedAt < GEOCODE_CACHE_TTL))) {
    return cached ? { lat: cached.lat, lon: cached.lon } : null;
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'fr,mc,de,es,at,it,ch,li',
    });

    const response = await fetch(`${NOMINATIM_API}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NomadRide/1.0',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Nominatim returned status ${response.status}`);
      return null;
    }

    const results = await response.json();
    if (results.length === 0) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const result = { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon), fetchedAt: Date.now() };
    geocodeCache.set(cacheKey, result);
    return { lat: result.lat, lon: result.lon };
  } catch (error) {
    console.error('❌ Nominatim geocoding error:', error);
    return null;
  }
}

interface OsmFuelStation {
  lat: number;
  lon: number;
  brand?: string;
  operator?: string;
  name?: string;
  ref?: string;
}

// Cache structure: key = "lat_lon_radius" rounded tile, value = OSM stations
const osmCache = new Map<string, { stations: OsmFuelStation[]; fetchedAt: number }>();
const OSM_CACHE_TTL = 6 * 3600 * 1000; // 6 hours — brands rarely change

// Helper to calculate distance in km using the Haversine formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate a cache key for a given center + radius, 
 * rounded to ~5km grid tiles to improve cache hit rate.
 */
function getCacheKey(lat: number, lon: number, radiusKm: number): string {
  // Round lat/lon to ~5km grid (0.045 degrees ≈ 5km)
  const gridLat = Math.round(lat / 0.045) * 0.045;
  const gridLon = Math.round(lon / 0.045) * 0.045;
  const gridRadius = Math.ceil(radiusKm / 5) * 5;
  return `${gridLat.toFixed(3)}_${gridLon.toFixed(3)}_${gridRadius}`;
}

/**
 * Fetch all fuel stations with brand data from OSM within a radius.
 * Uses a bounding box query for efficiency.
 */
async function fetchOsmFuelStations(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<OsmFuelStation[]> {
  const cacheKey = getCacheKey(lat, lon, radiusKm);
  const cached = osmCache.get(cacheKey);

  if (cached && (Date.now() - cached.fetchedAt < OSM_CACHE_TTL)) {
    return cached.stations;
  }

  // Convert radius to meters for Overpass API
  const radiusMeters = Math.ceil(radiusKm * 1000);

  // Overpass QL query: fetch fuel nodes + ways within radius, output as JSON with center coords
  // Set short internal timeout in Overpass QL
  const query = `[out:json][timeout:5];(node["amenity"="fuel"](around:${radiusMeters},${lat},${lon});way["amenity"="fuel"](around:${radiusMeters},${lat},${lon}););out center tags;`;

  for (const apiEndpoint of OVERPASS_APIS) {
    try {
      console.log(`🗺️ Fetching OSM fuel station brands from ${apiEndpoint} (radius: ${radiusKm}km)...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'NomadRide/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`⚠️ Overpass API (${apiEndpoint}) returned status ${response.status}`);
        continue;
      }

      const data = await response.json();
      const elements: OsmFuelStation[] = (data.elements || []).map((el: any) => {
        // For ways/relations, Overpass returns center coords when using "out center"
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        return {
          lat: elLat,
          lon: elLon,
          brand: el.tags?.brand || el.tags?.['brand:en'] || undefined,
          operator: el.tags?.operator || undefined,
          name: el.tags?.name || undefined,
          ref: el.tags?.['ref:FR:prix-carburants'] || undefined,
        };
      }).filter((s: OsmFuelStation) => s.lat !== undefined && s.lon !== undefined);

      console.log(`✅ OSM returned ${elements.length} fuel stations with brand data from ${apiEndpoint}`);

      osmCache.set(cacheKey, { stations: elements, fetchedAt: Date.now() });
      return elements;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`⏳ Overpass API (${apiEndpoint}) timed out after 6 seconds.`);
      } else {
        console.error(`❌ Overpass API error from ${apiEndpoint}:`, error);
      }
      // Continue loop to try next mirror
    }
  }

  console.warn('⚠️ All Overpass API mirrors failed to return brand data.');
  return cached?.stations ?? [];
}

/**
 * Look up the brand of a fuel station by matching its coordinates
 * against the nearest OSM fuel station within a tolerance of 150m.
 */
export async function lookupBrand(
  stationLat: number,
  stationLon: number,
  searchCenterLat: number,
  searchCenterLon: number,
  searchRadiusKm: number,
  stationId?: number
): Promise<string | undefined> {
  const osmStations = await fetchOsmFuelStations(searchCenterLat, searchCenterLon, searchRadiusKm);
  return findNearestBrand(osmStations, stationLat, stationLon, stationId);
}

/**
 * Batch-enrich an array of stations with OSM brand data.
 * Fetches OSM data once for the search area, then matches each station.
 */
export async function enrichStationsWithBrands(
  stations: Array<{ id: string | number; latitude: string; longitude: string; brand?: string }>,
  searchCenterLat: number,
  searchCenterLon: number,
  searchRadiusKm: number
): Promise<void> {
  const osmStations = await fetchOsmFuelStations(searchCenterLat, searchCenterLon, searchRadiusKm);

  if (osmStations.length === 0) {
    return;
  }

  let matched = 0;
  let unmatched = 0;
  for (const station of stations) {
    const parseCoord = (val: string | number) => {
      const parsed = parseFloat(val.toString());
      return !isNaN(parsed) && Math.abs(parsed) > 1000 ? parsed / 100000 : parsed;
    };
    const sLat = parseCoord(station.latitude);
    const sLon = parseCoord(station.longitude);

    if (isNaN(sLat) || isNaN(sLon)) continue;

    const brand = findNearestBrand(osmStations, sLat, sLon, station.id);
    if (brand) {
      station.brand = brand;
      matched++;
    } else {
      unmatched++;
    }
  }
  console.log(`📊 OSM matching: ${matched} matched, ${unmatched} unmatched out of ${stations.length} stations`);
}

/**
 * Find the brand of the nearest OSM fuel station within 150m tolerance.
 * First tries to match using the ref:FR:prix-carburants ID if available.
 */
function findNearestBrand(
  osmStations: OsmFuelStation[],
  lat: number,
  lon: number,
  id?: string | number
): string | undefined {
  // 1. Try matching by exact French government station ID if provided
  if (id !== undefined) {
    const idStr = String(id);
    const exactMatch = osmStations.find(osm => osm.ref === idStr);
    if (exactMatch && (exactMatch.brand || exactMatch.operator || exactMatch.name)) {
      return exactMatch.brand || exactMatch.operator || exactMatch.name;
    }
  }

  // 2. Fall back to proximity matching within 150m
  const MAX_MATCH_DISTANCE_KM = 0.15; // 150 meters
  let bestDistance = Infinity;
  let bestBrand: string | undefined;

  for (const osm of osmStations) {
    if (!osm.brand && !osm.operator && !osm.name) continue;

    const dist = haversineDistance(lat, lon, osm.lat, osm.lon);
    if (dist < bestDistance && dist <= MAX_MATCH_DISTANCE_KM) {
      bestDistance = dist;
      // Prefer brand > operator > name
      bestBrand = osm.brand || osm.operator || osm.name;
    }
  }

  return bestBrand;
}

interface NominatimSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

const autocompleteCache = new Map<string, Array<{ name: string; lat: number; lon: number }>>();

export async function autocompleteSearch(query: string): Promise<Array<{ name: string; lat: number; lon: number }>> {
  const cacheKey = query.trim().toLowerCase();
  if (cacheKey.length < 3) return [];

  const cached = autocompleteCache.get(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      countrycodes: 'fr,mc,de,es,at,it,ch,li',
      addressdetails: '1'
    });

    const response = await fetch(`${NOMINATIM_API}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NomadRide/1.0',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Nominatim autocomplete returned status ${response.status}`);
      return [];
    }

    const results = (await response.json()) as NominatimSearchResult[];
    const suggestions = results.map((item) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      const addr = item.address;
      const cleanCity = addr?.city || addr?.town || addr?.village || addr?.municipality || '';
      const postcode = addr?.postcode || '';

      let name = item.display_name;
      if (cleanCity) {
        name = postcode ? `${cleanCity} (${postcode})` : cleanCity;
      } else {
        const parts = item.display_name.split(',');
        name = parts.slice(0, 2).map(p => p.trim()).join(', ');
      }

      return { name, lat, lon };
    }).filter(s => !isNaN(s.lat) && !isNaN(s.lon));

    autocompleteCache.set(cacheKey, suggestions);
    return suggestions;
  } catch (error) {
    console.error('❌ Nominatim autocomplete error:', error);
    return [];
  }
}
