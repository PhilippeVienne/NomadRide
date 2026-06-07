import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCheapestFuel, FuelStation } from '../src/services/fuelService';

describe('Fuel Service - Best Value Algorithm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should calculate detour cost and apply freshness penalties correctly', async () => {
    // Toulouse center coordinates (43.6047, 1.4442)
    // Scale by 100000 -> 4360470, 144420
    const mockData: FuelStation[] = [
      {
        id: 1,
        latitude: '4360470', // At center
        longitude: '144420',
        cp: '31000',
        adresse: 'Center St',
        ville: 'Toulouse',
        sp98_prix: 1.90,
        sp98_maj: new Date().toISOString(), // Fresh
      },
      {
        id: 2,
        latitude: '4390000', // ~32.8 km away
        longitude: '144420',
        cp: '31200',
        adresse: 'Far St',
        ville: 'Toulouse',
        sp98_prix: 1.70, // Cheaper base price, but large detour
        sp98_maj: new Date().toISOString(), // Fresh
      },
      {
        id: 3,
        latitude: '4360470', // At center
        longitude: '144420',
        cp: '31000',
        adresse: 'Center St Stale',
        ville: 'Toulouse',
        sp98_prix: 1.88, // Slightly cheaper than id 1
        sp98_maj: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), // 48h stale!
      },
      {
        id: 4,
        latitude: '4360470',
        longitude: '144420',
        cp: '31000',
        adresse: 'Center St Ruptured',
        ville: 'Toulouse',
        sp98_rupture_type: 'definitive',
        sp98_rupture_debut: new Date().toISOString(),
      }
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('prix-des-carburants-en-france')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        });
      }
      if (url.includes('overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            elements: [
              { lat: 43.6047, lon: 1.4442, tags: { brand: 'Total' } },
              { lat: 43.9000, lon: 1.4442, tags: { brand: 'Esso' } },
              { lat: 43.7000, lon: 1.4442, tags: { brand: 'Esso' } }
            ]
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    // Query from Toulouse center (43.6047, 1.4442)
    const { stations: results } = await getCheapestFuel('sp98', 10, undefined, 43.6047, 1.4442, 50, true);

    // Should return 4 stations (3 with price, 1 in rupture)
    expect(results.length).toBe(4);

    // Station 1 should be Ranked #1 (Best Value)
    // Detour: 0km. Base: 1.90. Penalty: 0. Total cost: 9 * 1.90 = 17.10
    expect(results[0].id).toBe(1);
    expect(results[0].total_cost).toBe(17.10);
    expect(results[0].freshness_penalty).toBe(0);

    // Station 3 should be Ranked #2
    // Detour: 0km. Base: 1.88. Penalty: (48 - 12) * 0.002 = 0.072. Effective: 1.952. Total cost: 9 * 1.952 = 17.57
    expect(results[1].id).toBe(3);
    expect(results[1].freshness_penalty).toBeGreaterThan(0.07);

    // Station 2 should be Ranked #3
    // Detour: ~32.8km. Base: 1.70. Fuel consumed: ~2.62L. Detour cost: 2.62 * 1.70 = 4.46. Total cost: 15.30 + 4.46 = 19.76.
    expect(results[2].id).toBe(2);

    // Station 4 (ruptured) should be at the bottom
    expect(results[3].id).toBe(4);
    expect(results[3].total_cost).toBeUndefined();
  });

  it('should handle null/undefined address, city, or postal code during text search without crashing', async () => {
    const mockData: FuelStation[] = [
      {
        id: 1,
        latitude: '4360470',
        longitude: '144420',
        cp: '31000',
        adresse: null as any, // Simulate null values from API
        ville: null as any,
        sp98_prix: 1.90,
        sp98_maj: new Date().toISOString(),
      },
      {
        id: 2,
        latitude: '4360470',
        longitude: '144420',
        cp: '31000',
        adresse: 'Valid St',
        ville: 'Toulouse',
        sp98_prix: 1.80,
        sp98_maj: new Date().toISOString(),
      }
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('prix-des-carburants-en-france')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        });
      }
      if (url.includes('nominatim.openstreetmap.org')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]), // Simulate geocoding failure for fallback text search testing
        });
      }
      if (url.includes('overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            elements: [
              { lat: 43.6047, lon: 1.4442, tags: { brand: 'Total' } }
            ]
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    // Searching with a query should not crash and should return only matching stations where fields are defined
    const { stations: results } = await getCheapestFuel('sp98', 10, 'toulouse', undefined, undefined, 15, true);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(2);
  });

  it('should compute total cost correctly using custom fillSize and consumption parameters', async () => {
    const mockData: FuelStation[] = [
      {
        id: 1,
        latitude: '4360470',
        longitude: '144420',
        cp: '31000',
        adresse: 'Center St',
        ville: 'Toulouse',
        sp98_prix: 2.00,
        sp98_maj: new Date().toISOString(),
      },
      {
        id: 2,
        latitude: '4370000', // ~10.6 km away
        longitude: '144420',
        cp: '31000',
        adresse: 'Detour St',
        ville: 'Toulouse',
        sp98_prix: 1.80,
        sp98_maj: new Date().toISOString(),
      }
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('prix-des-carburants-en-france')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        });
      }
      if (url.includes('overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            elements: [
              { lat: 43.6047, lon: 1.4442, tags: { brand: 'Total' } },
              { lat: 43.9000, lon: 1.4442, tags: { brand: 'Esso' } },
              { lat: 43.7000, lon: 1.4442, tags: { brand: 'Esso' } }
            ]
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    // Custom params: fillSize = 15L, consumption = 5L/100km (0.05 L/km)
    // For id 1 (dist = 0km): total_cost = 15 * 2.00 = 30.00
    // For id 2 (dist = ~10.61km):
    //   Detour roundtrip = 21.22 km. Detour fuel consumed = 21.22 * 0.05 = 1.061 L.
    //   Detour cost = 1.061 * 1.80 = 1.91. Fill cost = 15 * 1.80 = 27.00. Total cost = 28.91
    const { stations: results } = await getCheapestFuel('sp98', 10, undefined, 43.6047, 1.4442, 50, true, 15, 5);

    expect(results.length).toBe(2);
    // Under custom params, Detour St (id 2) has total cost 28.91, Center St (id 1) has 30.00.
    // So id 2 is ranked #1 (Best Value)!
    expect(results[0].id).toBe(2);
    expect(results[0].total_cost).toBeCloseTo(28.91, 1);

    expect(results[1].id).toBe(1);
    expect(results[1].total_cost).toBeCloseTo(30.00, 1);
  });

  it('should prefer matching brands using the ref:FR:prix-carburants ID tag over proximity', async () => {
    const mockData: FuelStation[] = [
      {
        id: 69410006,
        latitude: '4580042',
        longitude: '478673',
        cp: '69410',
        adresse: '3 AVE GENERAL DE GAULLE',
        ville: "Champagne-au-Mont-d'Or",
        sp98_prix: 2.00,
        sp98_maj: new Date().toISOString(),
      }
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('prix-des-carburants-en-france')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        });
      }
      if (url.includes('overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            elements: [
              // This is Eni, matches by ID
              { lat: 45.8008, lon: 4.7858, tags: { brand: 'Eni', 'ref:FR:prix-carburants': '69410006' } },
              // This is Total, physically closer but ID does not match
              { lat: 45.8005, lon: 4.7867, tags: { brand: 'Total', 'ref:FR:prix-carburants': '69410007' } }
            ]
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const { stations: results } = await getCheapestFuel('sp98', 10, undefined, 45.8004, 4.7867, 5, true);

    expect(results.length).toBe(1);
    expect(results[0].brand).toBe('Eni'); // Should match Eni by ID, even though Total is closer
  });

  it('should exclude detour cost from ranking calculation when excludeDistance is true', async () => {
    const mockData: FuelStation[] = [
      {
        id: 1,
        latitude: '4360470', // At center
        longitude: '144420',
        cp: '31000',
        adresse: 'Center St',
        ville: 'Toulouse',
        sp98_prix: 1.90,
        sp98_maj: new Date().toISOString(),
      },
      {
        id: 2,
        latitude: '4390000', // ~32.8 km away
        longitude: '144420',
        cp: '31200',
        adresse: 'Far St',
        ville: 'Toulouse',
        sp98_prix: 1.70, // Cheaper base price, but large detour
        sp98_maj: new Date().toISOString(),
      }
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('prix-des-carburants-en-france')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        });
      }
      if (url.includes('overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ elements: [] }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    // Query from Toulouse center (43.6047, 1.4442) with excludeDistance = true
    const { stations: results } = await getCheapestFuel('sp98', 10, undefined, 43.6047, 1.4442, 50, true, undefined, undefined, true);

    expect(results.length).toBe(2);
    // With excludeDistance = true, Station 2 (price 1.70) must be Ranked #1 because detour is excluded
    expect(results[0].id).toBe(2);
    expect(results[0].total_cost).toBe(15.30); // 9 * 1.70 = 15.30

    // Station 1 (price 1.90) must be Ranked #2
    expect(results[1].id).toBe(1);
    expect(results[1].total_cost).toBe(17.10); // 9 * 1.90 = 17.10
  });

  it('should detect border zones and merge stations from multiple countries (FR + DE)', async () => {
    // Coordinate near Strasbourg-Kehl border (48.5734, 7.7866)
    const mockFrData: FuelStation[] = [
      {
        id: 'FR_1',
        latitude: '4857340', // Near center
        longitude: '775000',
        cp: '67000',
        adresse: 'Strasbourg St',
        ville: 'Strasbourg',
        sp98_prix: 1.90,
        sp98_maj: new Date().toISOString(),
      }
    ];

    const mockDeData = {
      ok: true,
      stations: [
        {
          id: 'DE_1',
          name: 'Kehl Station',
          brand: 'Aral',
          street: 'Hauptstr.',
          place: 'Kehl',
          lat: 48.5700,
          lng: 7.8000,
          dist: 1.5,
          diesel: 1.70,
          e5: 1.75, // mapped to sp98_prix in DE provider
          e10: 1.70,
          isOpen: true,
        }
      ]
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('prix-des-carburants-en-france')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFrData),
        });
      }
      if (url.includes('tankerkoenig.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDeData),
        });
      }
      if (url.includes('overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            elements: [
              { lat: 48.5734, lon: 7.7500, tags: { brand: 'Total' } }
            ]
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const { stations: results } = await getCheapestFuel('sp98', 10, undefined, 48.5734, 7.7866, 15, true);

    // Results should include 2 stations: 1 from FR, 1 from DE
    expect(results.length).toBe(2);

    // DE station is cheaper (1.75 vs 1.90) and should be ranked #1
    expect(results[0].id).toBe('DE_1');
    expect(results[0].brand).toBe('Aral');

    // FR station should be ranked #2
    expect(results[1].id).toBe('FR_1');
    expect(results[1].brand).toBe('Total');
  });

  it('should detect Swiss stations, normalize prices to EUR for sorting, and return results in CHF', async () => {
    // Geneva coordinate (46.2044, 6.1432)
    const mockSwissElements = [
      {
        id: 12345,
        lat: 46.2044,
        lon: 6.1432,
        tags: {
          amenity: 'fuel',
          brand: 'Avia',
          'addr:street': 'Rue de la Servette',
          'addr:city': 'Genève',
          'addr:postcode': '1202',
        }
      }
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('overpass-api.de') || url.includes('lz4.overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ elements: mockSwissElements }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const { stations: results } = await getCheapestFuel('sp95', 10, undefined, 46.2044, 6.1432, 10, true);

    expect(results.length).toBe(1);
    const station = results[0];
    expect(station.id).toBe('CH_12345');
    expect(station.currency).toBe('CHF');
    expect(station.currencySymbol).toBe('CHF');
    // CHF sp95_prix is mock base price (1.82 in SwitzerlandProvider for idx = 0)
    expect(station.sp95_prix).toBe(1.82);
    // total_cost in EUR before conversion was averageFill * sp95_prix_in_eur = 9 * (1.82 * 1.05) = 17.20 EUR
    // total_cost in CHF after conversion: 17.199 / 1.05 = 16.38 CHF
    expect(station.total_cost).toBeCloseTo(16.38, 1);
  });

  it('should deduplicate Swiss OSM fallback stations that are duplicates of official French stations in border zones', async () => {
    // Geneva coordinate (46.2044, 6.1432)
    // French station at coordinate 46.195, 6.26 (Annemasse)
    const mockFrData: FuelStation[] = [
      {
        id: 74100001,
        latitude: '4619500', // Annemasse
        longitude: '626000',
        cp: '74100',
        adresse: 'Rue de Geneve',
        ville: 'Annemasse',
        sp98_prix: 1.88,
        sp98_maj: new Date().toISOString(),
      }
    ];

    const mockOsmElements = [
      // Swiss station in Geneva (different coordinates)
      {
        id: 12345,
        lat: 46.2044,
        lon: 6.1432,
        tags: {
          amenity: 'fuel',
          brand: 'Avia',
          'addr:street': 'Rue de la Servette',
          'addr:city': 'Genève',
          'addr:postcode': '1202',
          'addr:country': 'CH',
        }
      },
      // French station in Annemasse (same/very close coordinates to mockFrData)
      // This has a French postcode and country tag, so it will be filtered out in SwitzerlandProvider.
      {
        id: 54321,
        lat: 46.1951,
        lon: 6.2601,
        tags: {
          amenity: 'fuel',
          brand: 'Système U',
          'addr:street': 'Rue de Genève',
          'addr:city': 'Annemasse',
          'addr:postcode': '74100',
          'addr:country': 'FR',
        }
      },
      // Another duplicate of official French station but without country or postcode tag.
      // This will pass SwitzerlandProvider filter but get caught by spatial deduplication in getCheapestFuel.
      {
        id: 99999,
        lat: 46.19505,
        lon: 6.26005,
        tags: {
          amenity: 'fuel',
          brand: 'Système U',
        }
      }
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('prix-des-carburants-en-france')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFrData),
        });
      }
      if (url.includes('overpass-api.de') || url.includes('lz4.overpass-api.de')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ elements: mockOsmElements }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const { stations: results } = await getCheapestFuel('sp98', 10, undefined, 46.2044, 6.1432, 20, true);

    // Results should include:
    // 1. The official French station (74100001) in EUR.
    // 2. The Swiss OSM station (CH_12345) in CHF.
    // 3. It should NOT include the French OSM station (CH_54321) because it has non-Swiss tags.
    // 4. It should NOT include the other duplicate OSM station (CH_99999) because of spatial deduplication.
    expect(results.length).toBe(2);

    const frStation = results.find(s => s.id === 74100001);
    const chStation = results.find(s => s.id === 'CH_12345');
    const duplicateStation1 = results.find(s => s.id === 'CH_54321');
    const duplicateStation2 = results.find(s => s.id === 'CH_99999');

    expect(frStation).toBeDefined();
    expect(frStation!.currency).toBe('EUR');
    expect(frStation!.sp98_prix).toBe(1.88);

    expect(chStation).toBeDefined();
    expect(chStation!.currency).toBe('CHF');

    expect(duplicateStation1).toBeUndefined();
    expect(duplicateStation2).toBeUndefined();
  });
});


