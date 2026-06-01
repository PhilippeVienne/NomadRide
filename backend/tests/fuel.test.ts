import { describe, it, expect, vi } from 'vitest';
import { getCheapestFuel } from '../src/services/fuelService';

describe('Fuel Service', () => {
  it('should filter and sort stations by fuel type', async () => {
    // Mock the global fetch
    const mockData = [
      { id: 1, sp98_prix: 1.95, sp95_prix: 1.85, ville: 'Paris' },
      { id: 2, sp98_prix: 1.85, sp95_prix: 1.75, ville: 'Lyon' },
      { id: 3, sp98_prix: null, ville: 'Marseille' },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const cheapestSP98 = await getCheapestFuel('sp98', 10);
    expect(cheapestSP98[0].id).toBe(2); // 1.85

    const cheapestSP95 = await getCheapestFuel('sp95', 10);
    expect(cheapestSP95[0].id).toBe(2); // 1.75
  });
});
