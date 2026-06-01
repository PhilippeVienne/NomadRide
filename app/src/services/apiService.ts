import { CONFIG } from '../config';

export interface FuelStation {
  id: number;
  adresse: string;
  ville: string;
  sp98_prix?: number;
  sp95_prix?: number;
  e10_prix?: number;
}

export type FuelType = 'sp98' | 'sp95' | 'e10';

export class ApiService {
  static async getCheapestFuel(type: FuelType, limit: number = 10): Promise<FuelStation[]> {
    try {
      const response = await fetch(`${CONFIG.ENDPOINTS.FUEL_CHEAPEST}?type=${type}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return data.stations;
    } catch (error) {
      console.error('ApiService.getCheapestFuel failed:', error);
      throw error;
    }
  }
}
