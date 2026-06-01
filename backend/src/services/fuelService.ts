export interface FuelStation {
  id: number;
  latitude: string;
  longitude: string;
  cp: string;
  adresse: string;
  ville: string;
  sp98_prix?: number;
  sp98_maj?: string;
  services_service?: string;
}

const API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/json?lang=fr&timezone=Europe%2FParis';

// Simple in-memory cache
let cachedStations: FuelStation[] = [];
let lastFetch: number = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour

export async function getFuelStations(): Promise<FuelStation[]> {
  const now = Date.now();
  if (cachedStations.length > 0 && now - lastFetch < CACHE_TTL) {
    console.log('⚡ Using cached fuel data');
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
    return cachedStations; // Return old data if fetch fails
  }
}

export async function getCheapestSP98(limit: number = 10): Promise<FuelStation[]> {
  const stations = await getFuelStations();
  return stations
    .filter((s) => s.sp98_prix !== undefined && s.sp98_prix !== null)
    .sort((a, b) => (a.sp98_prix || Infinity) - (b.sp98_prix || Infinity))
    .slice(0, limit);
}
