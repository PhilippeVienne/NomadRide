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
  services_service?: string;
}

export type FuelType = 'sp98' | 'sp95' | 'e10';

const API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/json?lang=fr&timezone=Europe%2FParis';

// Simple in-memory cache
let cachedStations: FuelStation[] = [];
let lastFetch: number = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour

export async function getFuelStations(): Promise<FuelStation[]> {
  const now = Date.now();
  if (cachedStations.length > 0 && now - lastFetch < CACHE_TTL) {
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
    return cachedStations;
  }
}

export async function getCheapestFuel(type: FuelType, limit: number = 10): Promise<FuelStation[]> {
  const stations = await getFuelStations();
  const priceKey = `${type}_prix` as keyof FuelStation;

  return stations
    .filter((s) => s[priceKey] !== undefined && s[priceKey] !== null)
    .sort((a, b) => ((a[priceKey] as number) || Infinity) - ((b[priceKey] as number) || Infinity))
    .slice(0, limit);
}
