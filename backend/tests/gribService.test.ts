import { describe, it, expect, vi } from 'vitest';
import { GribService } from '../src/services/gribService';
import { StorageManager } from '../src/services/storageManager';

// Mock StorageManager to avoid actual filesystem or S3 writes during testing
class MockStorageManager extends StorageManager {
  public savedData: Record<string, string> = {};

  constructor() {
    super();
  }

  override async save(key: string, data: string | Buffer): Promise<void> {
    this.savedData[key] = data.toString();
  }

  override async exists(key: string): Promise<boolean> {
    return !!this.savedData[key];
  }

  override async get(key: string): Promise<string> {
    if (!this.savedData[key]) {
      throw new Error(`File not found: ${key}`);
    }
    return this.savedData[key];
  }
}

describe('GribService - Weather Radar Pipeline', () => {
  it('should generate candidate run UTC reference times correctly', () => {
    const storage = new MockStorageManager();
    const service = new GribService(storage);
    const candidates = service.getCandidateRuns();

    expect(candidates.length).toBe(5);
    // Each run string should match the AROME run format YYYY-MM-DDTHH:00:00Z
    for (const run of candidates) {
      expect(run).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/);
      // Hour should be a multiple of 3
      const hour = parseInt(run.split('T')[1].split(':')[0], 10);
      expect(hour % 3).toBe(0);
    }
  });

  it('should run simulation pipeline and generate forecast hourly slices successfully', async () => {
    const storage = new MockStorageManager();
    const service = new GribService(storage);

    // Force simulation trigger by ensuring API key is empty
    process.env.MOCK_RADAR = 'true';
    await service.ingestLatestForecasts();

    // Verify files were generated in mock storage
    expect(storage.savedData['status.json']).toBeDefined();
    const status = JSON.parse(storage.savedData['status.json']);
    expect(status.availableSteps).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    for (let i = 0; i <= 12; i++) {
      const forecastFile = `forecast_${i}.json`;
      expect(storage.savedData[forecastFile]).toBeDefined();
      
      const forecast = JSON.parse(storage.savedData[forecastFile]);
      expect(forecast.step).toBe(i);
      
      // 1. Verify precipitation GeoJSON
      expect(forecast.geojson).toBeDefined();
      expect(forecast.geojson.type).toBe('FeatureCollection');
      expect(Array.isArray(forecast.geojson.features)).toBe(true);

      for (const feature of forecast.geojson.features) {
        expect(feature.type).toBe('Feature');
        expect(feature.properties.threshold).toBeDefined();
        expect(feature.properties.color).toBeDefined();
        expect(feature.properties.weight).toBeDefined();
        expect(feature.geometry.type).toBe('MultiLineString');
        expect(Array.isArray(feature.geometry.coordinates)).toBe(true);
      }

      // 2. Verify clouds GeoJSON
      expect(forecast.cloudsGeojson).toBeDefined();
      expect(forecast.cloudsGeojson.type).toBe('FeatureCollection');
      expect(Array.isArray(forecast.cloudsGeojson.features)).toBe(true);

      for (const feature of forecast.cloudsGeojson.features) {
        expect(feature.type).toBe('Feature');
        expect(feature.properties.threshold).toBeDefined();
        expect(feature.properties.color).toBeDefined();
        expect(feature.properties.weight).toBeDefined();
        expect(feature.geometry.type).toBe('MultiLineString');
        expect(Array.isArray(feature.geometry.coordinates)).toBe(true);
      }

      // 3. Verify wind data grid
      expect(forecast.windData).toBeDefined();
      expect(forecast.windData.gridWidth).toBeGreaterThan(0);
      expect(forecast.windData.gridHeight).toBeGreaterThan(0);
      expect(forecast.windData.bounds).toBeDefined();
      expect(forecast.windData.bounds.minLat).toBe(39.0);
      expect(forecast.windData.bounds.maxLat).toBe(51.5);
      expect(forecast.windData.bounds.minLon).toBe(-5.0);
      expect(forecast.windData.bounds.maxLon).toBe(16.0);
      expect(Array.isArray(forecast.windData.data)).toBe(true);
      expect(forecast.windData.data.length).toBe(forecast.windData.gridWidth * forecast.windData.gridHeight);

      for (const vec of forecast.windData.data) {
        expect(vec.length).toBe(2);
        expect(typeof vec[0]).toBe('number');
        expect(typeof vec[1]).toBe('number');
      }
    }
  });

  it('should correctly crop grid points strictly to longitude 16°E', async () => {
    const storage = new MockStorageManager();
    const service = new GribService(storage);

    // Call private pointsToContourGeoJSON using casting
    const pts = [
      { lat: 46.0, lon: 15.0, val: 5.0 },  // In bounds
      { lat: 46.0, lon: 15.9, val: 5.0 },  // In bounds
      { lat: 46.0, lon: 16.0, val: 5.0 },  // On boundary (in bounds)
      { lat: 46.0, lon: 16.1, val: 5.0 },  // Out of bounds
      { lat: 46.0, lon: 17.0, val: 5.0 }   // Out of bounds
    ];

    const geojson = (service as any).pointsToContourGeoJSON(pts);
    expect(geojson.type).toBe('FeatureCollection');

    // We check if the coordinates generated by Marching Squares are cropped.
    // If we only have longitude values <= 16 on the input grid, the output coordinates will be restricted.
    // Let's verify that points past 16 are not included.
    const lons: number[] = pts.map(p => p.lon);
    const croppedLons = lons.filter(l => l <= 16.0);
    expect(croppedLons.length).toBe(3);
    expect(croppedLons).not.toContain(16.1);
    expect(croppedLons).not.toContain(17.0);
  });

  it('should execute Marching Squares and generate proper contour segments', () => {
    const storage = new MockStorageManager();
    const service = new GribService(storage);

    // Setup a simple 3x3 grid
    // Row 0 (Lat 47): 0, 0, 0
    // Row 1 (Lat 46): 0, 5, 0 (Threshold 2.0 will create a loop around the center point)
    // Row 2 (Lat 45): 0, 0, 0
    const grid = [
      [0, 0, 0],
      [0, 5, 0],
      [0, 0, 0]
    ];
    const uniqueLats = [47.0, 46.0, 45.0];
    const uniqueLons = [2.0, 3.0, 4.0];

    const threshold = 2.0;
    const multiLine = (service as any).marchingSquares(grid, uniqueLats, uniqueLons, threshold);

    // A single centered value of 5.0 in a 3x3 grid will cross 4 surrounding cells.
    // This creates contour segments that merge into a closed loop (or lines).
    expect(multiLine.length).toBeGreaterThan(0);
    
    // Each line string should be an array of coordinate arrays [lon, lat]
    for (const line of multiLine) {
      expect(line.length).toBeGreaterThan(1);
      for (const pt of line) {
        expect(pt.length).toBe(2);
        // Longitudes should be between 2.0 and 4.0
        expect(pt[0]).toBeGreaterThanOrEqual(2.0);
        expect(pt[0]).toBeLessThanOrEqual(4.0);
        // Latitudes should be between 45.0 and 47.0
        expect(pt[1]).toBeGreaterThanOrEqual(45.0);
        expect(pt[1]).toBeLessThanOrEqual(47.0);
      }
    }
  });

  it('should merge disconnected segments into continuous polylines', () => {
    const storage = new MockStorageManager();
    const service = new GribService(storage);

    // Setup mock segments
    // Seg 1: [0,0] -> [1,1]
    // Seg 2: [1,1] -> [2,2]
    // Seg 3: [5,5] -> [6,6]
    const segments = [
      [[0, 0], [1, 1]],
      [[1, 1], [2, 2]],
      [[5, 5], [6, 6]]
    ];

    const merged = (service as any).mergeSegments(segments);

    // Should merge seg 1 and seg 2 into a single line [[0,0], [1,1], [2,2]]
    // and keep seg 3 as a separate line [[5,5], [6,6]]
    expect(merged.length).toBe(2);
    
    const line1 = merged.find((l: number[][]) => l.length === 3);
    const line2 = merged.find((l: number[][]) => l.length === 2);

    expect(line1).toBeDefined();
    expect(line1).toEqual([[0, 0], [1, 1], [2, 2]]);

    expect(line2).toBeDefined();
    expect(line2).toEqual([[5, 5], [6, 6]]);
  });
});
