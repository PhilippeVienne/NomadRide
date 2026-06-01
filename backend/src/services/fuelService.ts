import { enrichStationsWithBrands, geocodeSearch } from './osmService';

export interface FuelStation {
  id: number;
  latitude: string;
  longitude: string;
  cp: string;
  adresse: string;
  ville: string;
  sp98_prix?: number;
  sp95_prix?: number;
  e10_prix?: number;
  sp98_maj?: string;
  sp95_maj?: string;
  e10_maj?: string;
  sp98_rupture_debut?: string;
  sp98_rupture_type?: string;
  sp95_rupture_debut?: string;
  sp95_rupture_type?: string;
  e10_rupture_debut?: string;
  e10_rupture_type?: string;
  services_service?: string[];
  horaires_automate_24_24?: string;
  carburants_disponibles?: string[];
  carburants_indisponibles?: string[];
  distance?: number; // Optional distance in km
  total_cost?: number; // Calculated fill-up cost in € (fuel + detour)
  freshness_penalty?: number; // Applied freshness penalty in €/L
  brand?: string; // Brand name from OSM data
}

export type FuelType = 'sp98' | 'sp95' | 'e10';

const API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/json?lang=fr&timezone=Europe%2FParis';

// Simple in-memory cache
let cachedStations: FuelStation[] = [];
let lastFetch: number = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour

// Helper to calculate distance in km using the Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getFuelStations(forceRefresh: boolean = false): Promise<FuelStation[]> {
  const now = Date.now();
  if (!forceRefresh && cachedStations.length > 0 && (now - lastFetch < CACHE_TTL)) {
    return cachedStations;
  }

  console.log('📡 Fetching fresh fuel data from official API...');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    cachedStations = data;
    lastFetch = now;
    return cachedStations;
  } catch (error) {
    console.error('❌ Error fetching fuel data:', error);
    // Return cached data as fallback if remote API fails
    return cachedStations;
  }
}

export async function getCheapestFuel(
  type: FuelType,
  limit: number = 10,
  search?: string,
  lat?: number,
  lon?: number,
  radius: number = 15, // in km
  forceRefresh: boolean = false,
  fillSize: number = 9,
  consumption: number = 4
): Promise<{ stations: FuelStation[]; centerLat?: number; centerLon?: number }> {
  const stations = await getFuelStations(forceRefresh);
  const priceKey = `${type}_prix` as keyof FuelStation;
  const ruptureTypeKey = `${type}_rupture_type` as keyof FuelStation;

  // Map API fuel type names
  const fuelName = type === 'sp98' ? 'SP98' : type === 'sp95' ? 'SP95' : 'E10';

  // Constants/Parameters for motorcycle cost metrics
  const averageFill = fillSize; // Custom fill size (liters)
  const consumptionPerKm = consumption / 100; // Custom consumption rate per km (e.g. 4.0 L/100km = 0.04L/km)
  const detourMultiplier = 2; // Roundtrip detour to gas station

  let results = stations
    .filter((s) => {
      const hasPrice = s[priceKey] !== undefined && s[priceKey] !== null;
      const isAvailable = hasPrice && (!s.carburants_disponibles || s.carburants_disponibles.includes(fuelName));
      const hasRupture = (s[ruptureTypeKey] !== undefined && s[ruptureTypeKey] !== null) ||
        (s.carburants_indisponibles && s.carburants_indisponibles.includes(fuelName)) ||
        (!isAvailable && hasPrice); // If it has a price but isn't listed, treat as rupture
      return isAvailable || hasRupture;
    })
    .map((s) => ({ ...s })); // Clone to avoid mutating cache directly

  // 1. Resolve coordinates: use GPS if provided, otherwise geocode the search text
  let centerLat = lat;
  let centerLon = lon;

  if (centerLat === undefined || centerLon === undefined) {
    if (search && search.trim().length > 0) {
      const geocoded = await geocodeSearch(search.trim());
      if (geocoded) {
        centerLat = geocoded.lat;
        centerLon = geocoded.lon;
        console.log(`📍 Geocoded "${search}" → (${centerLat.toFixed(5)}, ${centerLon.toFixed(5)})`);
      }
    }
  }

  // 2. Filter by distance from center + enrich with OSM brands
  if (centerLat !== undefined && centerLon !== undefined) {
    results = results
      .map((s) => {
        const sLat = parseFloat(s.latitude) / 100000;
        const sLon = parseFloat(s.longitude) / 100000;
        if (!isNaN(sLat) && !isNaN(sLon)) {
          s.distance = calculateDistance(centerLat!, centerLon!, sLat, sLon);
        }
        return s;
      })
      .filter((s) => s.distance !== undefined && s.distance <= radius);

    // Enrich with OSM brand data
    if (results.length > 0) {
      await enrichStationsWithBrands(results, centerLat, centerLon, radius);
      // Only keep stations validated by OSM correlation
      results = results.filter((s) => s.brand !== undefined);
    }
  } else if (search && search.trim().length > 0) {
    // Fallback: if geocoding failed, use text filter without OSM
    const query = search.trim().toLowerCase();
    results = results.filter(
      (s) =>
        (s.ville && s.ville.toLowerCase().includes(query)) ||
        (s.cp && s.cp.startsWith(query)) ||
        (s.adresse && s.adresse.toLowerCase().includes(query))
    );
  }

  // 3. Calculate Detour Costs and Staleness Penalties
  const nowMs = Date.now();
  results = results.map((s) => {
    const price = s[priceKey] as number | undefined;
    const updateTime = s[`${type}_maj` as keyof FuelStation] as string | undefined;

    // Check explicit availability
    const isAvailable = (price !== undefined && price !== null) &&
      (!s.carburants_disponibles || s.carburants_disponibles.includes(fuelName));

    if (isAvailable) {
      // Calculate data freshness penalty
      let penalty = 0;
      if (updateTime) {
        const updateMs = new Date(updateTime).getTime();
        if (!isNaN(updateMs)) {
          const ageHours = (nowMs - updateMs) / (3600 * 1000);
          // Apply penalty if data is older than 12 hours: +0.002 € per stale hour, capped at +0.15 €
          if (ageHours > 12) {
            penalty = Math.min(0.15, (ageHours - 12) * 0.002);
          }
        }
      } else {
        penalty = 0.15; // Unknown update time penalty
      }

      s.freshness_penalty = parseFloat(penalty.toFixed(4));
      const effectivePrice = price! + penalty;

      // Calculate detour fuel cost and total cost
      if (s.distance !== undefined) {
        const detourFuel = s.distance * detourMultiplier * consumptionPerKm; // L of fuel for detour
        s.total_cost = parseFloat(((averageFill * effectivePrice) + (detourFuel * effectivePrice)).toFixed(2));
      } else {
        // Without geolocation, cost is just base fill cost + freshness risk
        s.total_cost = parseFloat((averageFill * effectivePrice).toFixed(2));
      }
    } else {
      // If not available, ensure price is removed so UI renders it as rupture
      (s as any)[priceKey] = undefined;
      // Synthesize rupture type if missing
      if (!s[ruptureTypeKey]) {
        (s as any)[ruptureTypeKey] = 'temporary'; // Default to temporary shortage
      }
    }
    return s;
  });

  // 4. Sort logic:
  // - Available stations (with price) come before out-of-stock (rupture) stations.
  // - If both have price: sort by total_cost (detour + price + freshness penalty) in ascending order.
  // - If total_costs are equal, sub-sort by distance.
  // - If both are in rupture, sub-sort by distance.
  const sorted = results
    .sort((a, b) => {
      const priceA = a[priceKey] as number | undefined;
      const priceB = b[priceKey] as number | undefined;

      const hasPriceA = priceA !== undefined && priceA !== null;
      const hasPriceB = priceB !== undefined && priceB !== null;

      if (hasPriceA && !hasPriceB) return -1;
      if (!hasPriceA && hasPriceB) return 1;

      if (hasPriceA && hasPriceB) {
        const costA = a.total_cost;
        const costB = b.total_cost;
        if (costA !== undefined && costB !== undefined && costA !== costB) {
          return costA - costB;
        }
        if (priceA! !== priceB!) {
          return priceA! - priceB!;
        }
      }

      // Sub-sort by distance if geolocation is active
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    })
    .slice(0, limit);

  return {
    stations: sorted,
    centerLat,
    centerLon,
  };
}
