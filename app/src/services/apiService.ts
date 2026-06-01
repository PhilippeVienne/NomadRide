import { CONFIG } from '../config';

export interface FuelStation {
  id: number;
  adresse: string;
  ville: string;
  latitude: string;
  longitude: string;
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
  distance?: number; // Distance in km if queried by geolocation
  total_cost?: number; // Calculated fill-up cost in €
  freshness_penalty?: number; // Applied freshness penalty in €/L
  brand?: string; // Brand name from OSM data
}

export type FuelType = 'sp98' | 'sp95' | 'e10';

export interface FuelQueryOptions {
  limit?: number;
  search?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  refresh?: boolean;
  fillSize?: number;
  consumption?: number;
}

export interface LocationSuggestion {
  name: string;
  lat: number;
  lon: number;
}

export interface CheapestFuelResponse {
  stations: FuelStation[];
  location?: { lat: number; lon: number; radius: number };
}

export class ApiService {
  static async getLocationSuggestions(query: string): Promise<LocationSuggestion[]> {
    try {
      if (query.trim().length < 3) return [];
      const url = `${CONFIG.ENDPOINTS.FUEL_CHEAPEST.replace('/cheapest', '/autocomplete')}?query=${encodeURIComponent(query.trim())}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Autocomplete API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('ApiService.getLocationSuggestions failed:', error);
      return [];
    }
  }

  static async getCheapestFuel(type: FuelType, options: FuelQueryOptions = {}): Promise<CheapestFuelResponse> {
    try {
      const params = new URLSearchParams();
      params.append('type', type);
      
      if (options.limit !== undefined) {
        params.append('limit', options.limit.toString());
      }
      if (options.search && options.search.trim().length > 0) {
        params.append('search', options.search.trim());
      }
      if (options.lat !== undefined && options.lon !== undefined) {
        params.append('lat', options.lat.toString());
        params.append('lon', options.lon.toString());
      }
      if (options.radius !== undefined) {
        params.append('radius', options.radius.toString());
      }
      if (options.refresh) {
        params.append('refresh', 'true');
      }
      if (options.fillSize !== undefined) {
        params.append('fillSize', options.fillSize.toString());
      }
      if (options.consumption !== undefined) {
        params.append('consumption', options.consumption.toString());
      }

      const url = `${CONFIG.ENDPOINTS.FUEL_CHEAPEST}?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return {
        stations: data.stations,
        location: data.location || undefined,
      };
    } catch (error) {
      console.error('ApiService.getCheapestFuel failed:', error);
      throw error;
    }
  }
}
