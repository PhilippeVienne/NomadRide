import { enrichStationsWithBrands, geocodeSearch } from './osmService';

export interface FuelStation {
  id: string | number;
  latitude: string;
  longitude: string;
  cp: string;
  adresse: string;
  ville: string;
  sp98_prix?: number;
  sp95_prix?: number;
  e10_prix?: number;
  gazole_prix?: number;
  sp98_maj?: string;
  sp95_maj?: string;
  e10_maj?: string;
  gazole_maj?: string;
  sp98_rupture_debut?: string;
  sp98_rupture_type?: string;
  sp95_rupture_debut?: string;
  sp95_rupture_type?: string;
  e10_rupture_debut?: string;
  e10_rupture_type?: string;
  gazole_rupture_debut?: string;
  gazole_rupture_type?: string;
  services_service?: string[];
  horaires_automate_24_24?: string;
  carburants_disponibles?: string[];
  carburants_indisponibles?: string[];
  distance?: number; // Optional distance in km
  total_cost?: number; // Calculated fill-up cost (fuel + detour) in station's currency
  freshness_penalty?: number; // Applied freshness penalty in currency/L
  brand?: string; // Brand name
  currency?: string; // e.g. 'EUR', 'CHF'
  currencySymbol?: string; // e.g. '€', 'CHF'
}

export type FuelType = 'sp98' | 'sp95' | 'e10' | 'gazole';

const FRANCE_API_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/json?lang=fr&timezone=Europe%2FParis';

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

// Helper to normalize coordinates across different APIs to standard decimal degrees format
export const formatCoord = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  const str = val.toString().trim();
  if (str.includes('.') || str.includes(',')) {
    return str.replace(',', '.');
  }
  const num = parseFloat(str);
  if (!isNaN(num) && Math.abs(num) > 1000) {
    // Large integers represent coordinates scaled by 100,000 (standard in the French API)
    return (num / 100000).toString();
  }
  return str;
};

// Provider interface
export interface FuelProvider {
  countryCode: string;
  fetchStations(lat?: number, lon?: number, radius?: number, fuelType?: FuelType, forceRefresh?: boolean): Promise<FuelStation[]>;
}

// France & Monaco Fuel Price Provider
class FranceProvider implements FuelProvider {
  countryCode = 'FR';
  private cachedStations: FuelStation[] = [];
  private lastFetch = 0;
  private CACHE_TTL = 3600 * 1000; // 1 hour

  async fetchStations(lat?: number, lon?: number, radius?: number, fuelType?: FuelType, forceRefresh?: boolean): Promise<FuelStation[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedStations.length > 0 && (now - this.lastFetch < this.CACHE_TTL)) {
      return this.cachedStations;
    }

    console.log('📡 Fetching fresh French fuel data from official API...');
    try {
      const response = await fetch(FRANCE_API_URL);
      if (!response.ok) throw new Error('France API request failed');
      
      const data = await response.json();
      this.cachedStations = data.map((s: any) => ({
        ...s,
        latitude: formatCoord(s.latitude),
        longitude: formatCoord(s.longitude),
        currency: 'EUR',
        currencySymbol: '€',
      }));
      this.lastFetch = now;
      return this.cachedStations;
    } catch (error) {
      console.error('❌ Error fetching French fuel data:', error);
      return this.cachedStations; // Fallback to cache
    }
  }

  // Exposed for tests or internal caching compatibility
  setCache(stations: FuelStation[]) {
    this.cachedStations = stations;
    this.lastFetch = Date.now();
  }

  getCache() {
    return this.cachedStations;
  }
}

// Spain Fuel Price Provider
class SpainProvider implements FuelProvider {
  countryCode = 'ES';
  private cachedStations: FuelStation[] = [];
  private lastFetch = 0;
  private CACHE_TTL = 2 * 3600 * 1000; // 2 hours

  async fetchStations(lat?: number, lon?: number, radius?: number, fuelType?: FuelType, forceRefresh?: boolean): Promise<FuelStation[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedStations.length > 0 && (now - this.lastFetch < this.CACHE_TTL)) {
      return this.cachedStations;
    }

    console.log('📡 Fetching fresh Spanish fuel data from MITYC API...');
    try {
      const url = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Spanish MITYC API request failed');
      
      const data = await response.json();
      const list = data.ListaEESSPrecio || [];
      
      // Parse data.Fecha "DD/MM/YYYY HH:mm:ss"
      let majDateStr = new Date().toISOString();
      if (data.Fecha) {
        const parts = data.Fecha.split(' ');
        if (parts.length === 2) {
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            majDateStr = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1]}`).toISOString();
          }
        }
      }

      const parsePrice = (val?: string) => {
        if (!val) return undefined;
        const parsed = parseFloat(val.replace(',', '.'));
        return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
      };

      this.cachedStations = list.map((s: any) => {
        const sp98 = parsePrice(s['Precio Gasolina 98 E5']);
        const sp95 = parsePrice(s['Precio Gasolina 95 E5']);
        const e10 = parsePrice(s['Precio Gasolina 95 E10']);
        const gazole = parsePrice(s['Precio Gasoleo A']);

        const brandName = s['Rótulo'] ? s['Rótulo'].trim() : 'Unknown';

        const station: FuelStation = {
          id: s.IDEESS,
          latitude: formatCoord(s.Latitud),
          longitude: formatCoord(s['Longitud (WGS84)']),
          cp: s['C.P.'] || '',
          adresse: s['Dirección'] || '',
          ville: s.Localidad || '',
          brand: brandName,
          services_service: [],
          carburants_disponibles: [],
          currency: 'EUR',
          currencySymbol: '€',
        };

        if (sp98 !== undefined) {
          station.sp98_prix = sp98;
          station.sp98_maj = majDateStr;
          station.carburants_disponibles!.push('SP98');
        }
        if (sp95 !== undefined) {
          station.sp95_prix = sp95;
          station.sp95_maj = majDateStr;
          station.carburants_disponibles!.push('SP95');
        }
        if (e10 !== undefined) {
          station.e10_prix = e10;
          station.e10_maj = majDateStr;
          station.carburants_disponibles!.push('E10');
        }
        if (gazole !== undefined) {
          station.gazole_prix = gazole;
          station.gazole_maj = majDateStr;
          station.carburants_disponibles!.push('Gazole');
        }

        return station;
      });

      this.lastFetch = now;
      return this.cachedStations;
    } catch (error) {
      console.error('❌ Error fetching Spanish fuel data:', error);
      return this.cachedStations; // Fallback to cache
    }
  }

  setCache(stations: FuelStation[]) {
    this.cachedStations = stations;
    this.lastFetch = Date.now();
  }
}

// Germany Fuel Price Provider
class GermanyProvider implements FuelProvider {
  countryCode = 'DE';
  private queryCache = new Map<string, { stations: FuelStation[]; fetchedAt: number }>();
  private CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  async fetchStations(lat?: number, lon?: number, radius?: number, fuelType?: FuelType, forceRefresh?: boolean): Promise<FuelStation[]> {
    if (lat === undefined || lon === undefined) return [];
    const rad = radius || 15;
    
    // Grid alignment for query coordinates to increase cache hits
    const gridLat = Math.round(lat / 0.018) * 0.018;
    const gridLon = Math.round(lon / 0.018) * 0.018;
    const cacheKey = `${gridLat.toFixed(4)}_${gridLon.toFixed(4)}_${rad}`;
    
    if (!forceRefresh) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && (Date.now() - cached.fetchedAt < this.CACHE_TTL)) {
        return cached.stations;
      }
    }

    const apiKey = process.env.TANKERKOENIG_API_KEY || '00000000-0000-0000-0000-000000000002';
    const url = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lon}&rad=${rad}&sort=dist&type=all&apikey=${apiKey}`;
    
    console.log(`📡 Querying TankerKönig DE API at (${lat}, ${lon}) with radius ${rad}km...`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`German TankerKönig API status: ${response.status}`);
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || 'TankerKönig query failed');
      }

      const stations: FuelStation[] = (data.stations || []).map((s: any) => {
        const diesel = parseFloat(s.diesel);
        const e5 = parseFloat(s.e5);
        const e10 = parseFloat(s.e10);

        const station: FuelStation = {
          id: s.id,
          latitude: formatCoord(s.lat),
          longitude: formatCoord(s.lng),
          cp: s.postCode ? s.postCode.toString() : '',
          adresse: s.street + (s.houseNumber ? ' ' + s.houseNumber : ''),
          ville: s.place || '',
          brand: s.brand || s.name || 'Unknown',
          services_service: [],
          carburants_disponibles: [],
          currency: 'EUR',
          currencySymbol: '€',
        };

        const nowIso = new Date().toISOString();

        if (!isNaN(diesel) && diesel > 0) {
          station.gazole_prix = diesel;
          station.gazole_maj = nowIso;
          station.carburants_disponibles!.push('Gazole');
        }
        if (!isNaN(e5) && e5 > 0) {
          station.sp95_prix = e5;
          station.sp95_maj = nowIso;
          station.sp98_prix = e5; // E5 Super acts as fallback for SP98 in Germany list
          station.sp98_maj = nowIso;
          station.carburants_disponibles!.push('SP95', 'SP98');
        }
        if (!isNaN(e10) && e10 > 0) {
          station.e10_prix = e10;
          station.e10_maj = nowIso;
          station.carburants_disponibles!.push('E10');
        }

        return station;
      });

      this.queryCache.set(cacheKey, { stations, fetchedAt: Date.now() });
      return stations;
    } catch (error) {
      console.error('❌ Error fetching German fuel data:', error);
      return [];
    }
  }

  setCacheForGrid(lat: number, lon: number, radius: number, stations: FuelStation[]) {
    const gridLat = Math.round(lat / 0.018) * 0.018;
    const gridLon = Math.round(lon / 0.018) * 0.018;
    const cacheKey = `${gridLat.toFixed(4)}_${gridLon.toFixed(4)}_${radius}`;
    this.queryCache.set(cacheKey, { stations, fetchedAt: Date.now() });
  }
}

// Austria Fuel Price Provider
class AustriaProvider implements FuelProvider {
  countryCode = 'AT';
  private queryCache = new Map<string, { stations: FuelStation[]; fetchedAt: number }>();
  private CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  async fetchStations(lat?: number, lon?: number, radius?: number, fuelType?: FuelType, forceRefresh?: boolean): Promise<FuelStation[]> {
    if (lat === undefined || lon === undefined) return [];
    
    const atFuelType = fuelType === 'gazole' ? 'DIE' : 'SUP';
    const rad = radius || 15;
    
    const gridLat = Math.round(lat / 0.018) * 0.018;
    const gridLon = Math.round(lon / 0.018) * 0.018;
    const cacheKey = `${gridLat.toFixed(4)}_${gridLon.toFixed(4)}_${rad}_${atFuelType}`;

    if (!forceRefresh) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && (Date.now() - cached.fetchedAt < this.CACHE_TTL)) {
        return cached.stations;
      }
    }

    const url = `https://api.e-control.at/sprit/1.0/search/gas-stations/by-address?latitude=${lat}&longitude=${lon}&fuelType=${atFuelType}&includeClosed=false`;
    console.log(`📡 Querying E-Control AT API at (${lat}, ${lon}) with fuel type ${atFuelType}...`);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Austrian E-Control API returned status ${response.status}`);
      const data = (await response.json()) as any[];
      
      const stations: FuelStation[] = data.map((s: any) => {
        const priceObj = s.prices && s.prices[0];
        const price = priceObj ? parseFloat(priceObj.amount) : undefined;
        
        const station: FuelStation = {
          id: s.id,
          latitude: formatCoord(s.location.latitude),
          longitude: formatCoord(s.location.longitude),
          cp: s.location.postalCode || '',
          adresse: s.location.address || '',
          ville: s.location.city || '',
          brand: s.name || 'Unknown',
          services_service: [],
          carburants_disponibles: [],
          currency: 'EUR',
          currencySymbol: '€',
        };

        const nowIso = new Date().toISOString();

        if (price !== undefined && !isNaN(price) && price > 0) {
          if (atFuelType === 'DIE') {
            station.gazole_prix = price;
            station.gazole_maj = nowIso;
            station.carburants_disponibles!.push('Gazole');
          } else {
            station.sp95_prix = price;
            station.sp95_maj = nowIso;
            station.sp98_prix = price; // Fallback
            station.sp98_maj = nowIso;
            station.e10_prix = price; // Fallback
            station.e10_maj = nowIso;
            station.carburants_disponibles!.push('SP95', 'SP98', 'E10');
          }
        }

        return station;
      });

      this.queryCache.set(cacheKey, { stations, fetchedAt: Date.now() });
      return stations;
    } catch (error) {
      console.error('❌ Error fetching Austrian fuel data:', error);
      return [];
    }
  }

  setCacheForGrid(lat: number, lon: number, radius: number, fuelType: FuelType, stations: FuelStation[]) {
    const atFuelType = fuelType === 'gazole' ? 'DIE' : 'SUP';
    const gridLat = Math.round(lat / 0.018) * 0.018;
    const gridLon = Math.round(lon / 0.018) * 0.018;
    const cacheKey = `${gridLat.toFixed(4)}_${gridLon.toFixed(4)}_${radius}_${atFuelType}`;
    this.queryCache.set(cacheKey, { stations, fetchedAt: Date.now() });
  }
}

// Switzerland & Liechtenstein Fuel Price Provider (OSM Fallback + Mock stable Swiss prices)
class SwitzerlandProvider implements FuelProvider {
  countryCode = 'CH';
  private queryCache = new Map<string, { stations: FuelStation[]; fetchedAt: number }>();
  private CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  async fetchStations(lat?: number, lon?: number, radius?: number, fuelType?: FuelType, forceRefresh?: boolean): Promise<FuelStation[]> {
    if (lat === undefined || lon === undefined) return [];
    const rad = radius || 15;

    const gridLat = Math.round(lat / 0.018) * 0.018;
    const gridLon = Math.round(lon / 0.018) * 0.018;
    const cacheKey = `${gridLat.toFixed(4)}_${gridLon.toFixed(4)}_${rad}`;

    if (!forceRefresh) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && (Date.now() - cached.fetchedAt < this.CACHE_TTL)) {
        return cached.stations;
      }
    }

    console.log(`📡 Fetching Swiss fuel stations from OSM at (${lat}, ${lon}) with radius ${rad}km...`);
    try {
      const radiusMeters = Math.ceil(rad * 1000);
      const query = `[out:json][timeout:5];(node["amenity"="fuel"](around:${radiusMeters},${lat},${lon});way["amenity"="fuel"](around:${radiusMeters},${lat},${lon}););out center tags;`;
      
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
      ];
      
      let elements: any[] = [];
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
              'User-Agent': 'NomadRide/1.0',
            },
            body: `data=${encodeURIComponent(query)}`,
          });
          if (res.ok) {
            const data = await res.json();
            elements = data.elements || [];
            break;
          }
        } catch (e: any) {
          console.warn(`Overpass mirror ${endpoint} failed:`, e.message);
        }
      }

      const stations: FuelStation[] = elements
        .filter((el: any) => {
          // If country code is set, it must be CH (Switzerland) or LI (Liechtenstein)
          const country = el.tags?.['addr:country']?.toUpperCase();
          if (country && country !== 'CH' && country !== 'LI') {
            return false;
          }
          // If postcode is set, reject 5-digit postcodes (typical of FR/DE)
          const postcode = el.tags?.['addr:postcode'];
          if (postcode && /^\d{5}$/.test(postcode)) {
            return false;
          }
          // Verify coordinates lie within Swiss + Liechtenstein bounding box
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          if (elLat !== undefined && elLon !== undefined) {
            const inCHBox = elLat >= 45.8 && elLat <= 47.9 && elLon >= 5.9 && elLon <= 10.5;
            if (!inCHBox) return false;
          }
          return true;
        })
        .map((el: any, idx: number) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          const brandName = el.tags?.brand || el.tags?.operator || el.tags?.name || 'Avia';
          
          // Mock stable Swiss prices (roughly 1.80 - 1.95 CHF, converted to €)
          const basePrice = 1.82 + (idx % 5) * 0.03; 
          const sp95 = basePrice;
          const sp98 = basePrice + 0.08;
          const e10 = basePrice - 0.02;
          const gazole = basePrice + 0.05;

          const nowIso = new Date().toISOString();

          return {
            id: `CH_${el.id}`,
            latitude: formatCoord(elLat),
            longitude: formatCoord(elLon),
            cp: el.tags?.['addr:postcode'] || '',
            adresse: el.tags?.['addr:street'] || '',
            ville: el.tags?.['addr:city'] || 'Genève',
            brand: brandName,
            sp95_prix: parseFloat(sp95.toFixed(3)),
            sp95_maj: nowIso,
            sp98_prix: parseFloat(sp98.toFixed(3)),
            sp98_maj: nowIso,
            e10_prix: parseFloat(e10.toFixed(3)),
            e10_maj: nowIso,
            gazole_prix: parseFloat(gazole.toFixed(3)),
            gazole_maj: nowIso,
            services_service: [],
            carburants_disponibles: ['SP95', 'SP98', 'E10', 'Gazole'],
            currency: 'CHF',
            currencySymbol: 'CHF',
          };
        });

      this.queryCache.set(cacheKey, { stations, fetchedAt: Date.now() });
      return stations;
    } catch (error) {
      console.error('❌ Error fetching Swiss fuel data:', error);
      return [];
    }
  }
}

// Instantiate providers
export const frProvider = new FranceProvider();
export const esProvider = new SpainProvider();
export const deProvider = new GermanyProvider();
export const atProvider = new AustriaProvider();
export const chProvider = new SwitzerlandProvider();

const providers: FuelProvider[] = [
  frProvider,
  esProvider,
  deProvider,
  atProvider,
  chProvider,
];

const CHF_TO_EUR = 1.05;

// Country Boundaries for spatial overlap detection
interface CountryBounds {
  code: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

const countryBoundsList: CountryBounds[] = [
  { code: 'FR', minLat: 41.0, maxLat: 51.5, minLon: -5.5, maxLon: 9.6 },       // France + Monaco
  { code: 'DE', minLat: 47.2, maxLat: 55.1, minLon: 5.8, maxLon: 15.1 },      // Germany
  { code: 'ES', minLat: 35.9, maxLat: 43.8, minLon: -9.3, maxLon: 3.4 },       // Spain
  { code: 'AT', minLat: 46.3, maxLat: 49.1, minLon: 9.5, maxLon: 17.2 },      // Austria
  { code: 'CH', minLat: 45.8, maxLat: 47.8, minLon: 5.9, maxLon: 10.5 },      // Switzerland + Liechtenstein
];

// Compatibility exports
export async function getFuelStations(forceRefresh: boolean = false): Promise<FuelStation[]> {
  return frProvider.fetchStations(undefined, undefined, undefined, undefined, forceRefresh);
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
  consumption: number = 4,
  excludeDistance: boolean = false
): Promise<{ stations: FuelStation[]; centerLat?: number; centerLon?: number }> {
  // Resolve coordinates: use GPS if provided, otherwise geocode the search text
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

  // Detect overlapping countries
  let overlappingCountries: string[] = [];
  if (centerLat !== undefined && centerLon !== undefined) {
    const latDiff = radius / 111.32;
    const lonDiff = radius / (111.32 * Math.cos(centerLat * Math.PI / 180));
    const queryMinLat = centerLat - latDiff;
    const queryMaxLat = centerLat + latDiff;
    const queryMinLon = centerLon - lonDiff;
    const queryMaxLon = centerLon + lonDiff;

    for (const bounds of countryBoundsList) {
      if (
        queryMinLat <= bounds.maxLat &&
        queryMaxLat >= bounds.minLat &&
        queryMinLon <= bounds.maxLon &&
        queryMaxLon >= bounds.minLon
      ) {
        overlappingCountries.push(bounds.code);
      }
    }
  } else {
    // If no coordinates resolved, query from FR and ES local cache by default
    overlappingCountries = ['FR', 'ES'];
  }

  if (overlappingCountries.length === 0) {
    overlappingCountries = ['FR'];
  }

  console.log(`🌍 Query overlapping countries: ${overlappingCountries.join(', ')}`);

  // Fetch concurrently from all overlapping providers
  const fetchPromises = providers
    .filter(p => overlappingCountries.includes(p.countryCode))
    .map(p => p.fetchStations(centerLat, centerLon, radius, type, forceRefresh));

  const resultsList = await Promise.all(fetchPromises);
  let stations = resultsList.flat().map((s) => ({ ...s })); // Clone to avoid mutating cache

  const priceKey = `${type}_prix` as keyof FuelStation;
  const ruptureTypeKey = `${type}_rupture_type` as keyof FuelStation;
  const fuelName = type === 'sp98' ? 'SP98' : type === 'sp95' ? 'SP95' : type === 'e10' ? 'E10' : 'Gazole';

  // Constants for detour/motorcycle cost metrics
  const averageFill = fillSize; 
  const consumptionPerKm = consumption / 100;
  const detourMultiplier = 2;

  // Filter stations based on availability/ruptures
  let results = stations.filter((s) => {
    const hasPrice = s[priceKey] !== undefined && s[priceKey] !== null;
    const isAvailable = hasPrice && (!s.carburants_disponibles || s.carburants_disponibles.includes(fuelName));
    const hasRupture = (s[ruptureTypeKey] !== undefined && s[ruptureTypeKey] !== null) ||
      (s.carburants_indisponibles && s.carburants_indisponibles.includes(fuelName)) ||
      (!isAvailable && hasPrice);
    return isAvailable || hasRupture;
  });

  // Calculate distance & brand enrichment
  if (centerLat !== undefined && centerLon !== undefined) {
    results = results
      .map((s) => {
        const sLat = parseFloat(s.latitude);
        const sLon = parseFloat(s.longitude);
        if (!isNaN(sLat) && !isNaN(sLon)) {
          s.distance = calculateDistance(centerLat!, centerLon!, sLat, sLon);
        }
        return s;
      })
      .filter((s) => s.distance !== undefined && s.distance <= radius);
      
    // Deduplicate OSM fallback stations (from SwitzerlandProvider, starts with 'CH_')
    // against official provider stations (do not start with 'CH_') within 150 meters.
    const officialStations = results.filter((s) => !s.id.toString().startsWith('CH_'));
    const osmStations = results.filter((s) => s.id.toString().startsWith('CH_'));

    const filteredOsmStations = osmStations.filter((osm) => {
      const osmLat = parseFloat(osm.latitude);
      const osmLon = parseFloat(osm.longitude);
      if (isNaN(osmLat) || isNaN(osmLon)) return false;

      const isDuplicate = officialStations.some((off) => {
        const offLat = parseFloat(off.latitude);
        const offLon = parseFloat(off.longitude);
        if (isNaN(offLat) || isNaN(offLon)) return false;
        
        const distBetween = calculateDistance(osmLat, osmLon, offLat, offLon);
        return distBetween <= 0.15; // 150 meters
      });

      return !isDuplicate;
    });

    results = [...officialStations, ...filteredOsmStations];

    // Batch enrich brand names using OSM Overpass for stations with missing/unknown brand
    const stationsToEnrich = results.filter((s) => !s.brand || s.brand === 'Unknown');
    if (stationsToEnrich.length > 0) {
      await enrichStationsWithBrands(stationsToEnrich, centerLat, centerLon, radius);
      // Map brand names back
      for (const enriched of stationsToEnrich) {
        const match = results.find(s => s.id === enriched.id);
        if (match) match.brand = enriched.brand;
      }
    }

    // Only keep stations that have a valid brand
    results = results.filter((s) => s.brand !== undefined && s.brand !== null && s.brand !== '');
  } else if (search && search.trim().length > 0) {
    // Fallback: query filter
    const query = search.trim().toLowerCase();
    results = results.filter(
      (s) =>
        (s.ville && s.ville.toLowerCase().includes(query)) ||
        (s.cp && s.cp.startsWith(query)) ||
        (s.adresse && s.adresse.toLowerCase().includes(query))
    );
  }

  // Calculate detour costs and staleness penalties
  const nowMs = Date.now();
  results = results.map((s) => {
    const price = s[priceKey] as number | undefined;
    const updateTime = s[`${type}_maj` as keyof FuelStation] as string | undefined;

    const isAvailable = (price !== undefined && price !== null) &&
      (!s.carburants_disponibles || s.carburants_disponibles.includes(fuelName));

    if (isAvailable) {
      // Determine currency normalization factor (CHF -> EUR)
      const isSwiss = s.currency === 'CHF';
      const toEur = isSwiss ? CHF_TO_EUR : 1.0;
      const priceInEur = price! * toEur;

      // staleness penalty logic (calculated in EUR)
      let penaltyInEur = 0;
      if (updateTime) {
        const updateMs = new Date(updateTime).getTime();
        if (!isNaN(updateMs)) {
          const ageHours = (nowMs - updateMs) / (3600 * 1000);
          if (ageHours > 12) {
            penaltyInEur = Math.min(0.15, (ageHours - 12) * 0.002);
          }
        }
      } else {
        penaltyInEur = 0.15;
      }

      s.freshness_penalty = penaltyInEur; // Keep in EUR for now
      const effectivePriceInEur = priceInEur + penaltyInEur;

      if (s.distance !== undefined && !excludeDistance) {
        const detourFuel = s.distance * detourMultiplier * consumptionPerKm;
        s.total_cost = (averageFill * effectivePriceInEur) + (detourFuel * effectivePriceInEur);
      } else {
        s.total_cost = averageFill * effectivePriceInEur;
      }
    } else {
      (s as any)[priceKey] = undefined;
      if (!s[ruptureTypeKey]) {
        (s as any)[ruptureTypeKey] = 'temporary';
      }
    }
    return s;
  });

  // Sorting logic
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
        
        // Base price comparison normalized to EUR
        const priceAInEur = priceA! * (a.currency === 'CHF' ? CHF_TO_EUR : 1.0);
        const priceBInEur = priceB! * (b.currency === 'CHF' ? CHF_TO_EUR : 1.0);
        if (priceAInEur !== priceBInEur) {
          return priceAInEur - priceBInEur;
        }
      }

      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    })
    .slice(0, limit);

  // Post-process to format and convert Swiss values back to CHF
  const formattedStations = sorted.map((s) => {
    const isSwiss = s.currency === 'CHF';

    if (s.total_cost !== undefined) {
      const convertedCost = isSwiss ? (s.total_cost / CHF_TO_EUR) : s.total_cost;
      s.total_cost = parseFloat(convertedCost.toFixed(2));
    }
    if (s.freshness_penalty !== undefined) {
      const convertedPenalty = isSwiss ? (s.freshness_penalty / CHF_TO_EUR) : s.freshness_penalty;
      s.freshness_penalty = parseFloat(convertedPenalty.toFixed(4));
    }
    return s;
  });

  return {
    stations: formattedStations,
    centerLat,
    centerLon,
  };
}
