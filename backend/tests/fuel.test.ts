import { describe, it, expect, vi } from 'vitest';
import { getCheapestSP98 } from '../src/services/fuelService';

describe('Fuel Service', () => {
  it('should filter and sort stations by SP98 price', async () => {
    // Mock the global fetch
    const mockData = [
      { id: 1, sp98_prix: 1.95, ville: 'Paris' },
      { id: 2, sp98_prix: 1.85, ville: 'Lyon' },
      { id: 3, sp98_prix: null, ville: 'Marseille' },
      { id: 4, sp98_prix: 2.10, ville: 'Nice' },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const cheapest = await getCheapestSP98(2);

    expect(cheapest).toHaveLength(2);
    expect(cheapest[0].id).toBe(2); // 1.85
    expect(cheapest[1].id).toBe(1); // 1.95
  });
});
