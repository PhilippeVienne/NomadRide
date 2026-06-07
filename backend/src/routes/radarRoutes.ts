import { Hono } from 'hono';
import { StorageManager } from '../services/storageManager';
import { GribService } from '../services/gribService';

const radar = new Hono();
const storageManager = new StorageManager();
const gribService = new GribService(storageManager);

/**
 * GET /api/radar/status
 * Retrieves metadata about the latest downloaded forecast run.
 */
radar.get('/status', async (c) => {
  try {
    const exists = await storageManager.exists('status.json');
    if (!exists) {
      return c.json({
        status: 'error',
        message: 'No forecast data available yet. Please trigger an ingestion.',
      }, 404);
    }
    const data = await storageManager.get('status.json');
    const status = JSON.parse(data.toString());
    return c.json(status);
  } catch (err: any) {
    console.error('[RadarRoutes] Error getting status:', err);
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

/**
 * GET /api/radar/forecast/:hour
 * Retrieves the precipitation GeoJSON isolines for a specific forecast hour (H+0 to H+12)
 * with maximum caching headers.
 */
radar.get('/forecast/:hour', async (c) => {
  const hourStr = c.req.param('hour');
  const hour = parseInt(hourStr, 10);

  if (isNaN(hour) || hour < 0 || hour > 12) {
    return c.json({
      status: 'error',
      message: 'Invalid hour parameter. Must be an integer between 0 and 12.',
    }, 400);
  }

  const filename = `forecast_${hour}.json`;

  try {
    const exists = await storageManager.exists(filename);
    if (!exists) {
      return c.json({
        status: 'error',
        message: `Forecast data for hour H+${hour} is not available.`,
      }, 404);
    }

    const fileContent = await storageManager.get(filename);
    
    // Inject maximum HTTP cache headers directly as requested
    c.header('Content-Type', 'application/json');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    
    return c.body(fileContent.toString());
  } catch (err: any) {
    console.error(`[RadarRoutes] Error fetching forecast for hour H+${hour}:`, err);
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

/**
 * POST /api/radar/ingest
 * Manually triggers the GRIB2 ingestion and processing pipeline.
 * Runs asynchronously and returns 202 Accepted.
 */
radar.post('/ingest', async (c) => {
  console.log('[RadarRoutes] Ingestion triggered manually.');
  
  // Trigger asynchronously to avoid API timeout
  gribService.ingestLatestForecasts()
    .then(() => console.log('[RadarRoutes] Manual ingestion completed.'))
    .catch((err) => console.error('[RadarRoutes] Manual ingestion failed:', err));

  return c.json({
    status: 'accepted',
    message: 'Ingestion pipeline started in the background.',
    timestamp: new Date().toISOString(),
  }, 202);
});

export default radar;
