import { Hono } from 'hono';
import { getCheapestFuel, FuelType } from '../services/fuelService';
import { autocompleteSearch } from '../services/osmService';

const fuel = new Hono();

fuel.get('/autocomplete', async (c) => {
  const query = c.req.query('query') || '';
  if (query.trim().length < 3) {
    return c.json([]);
  }
  const suggestions = await autocompleteSearch(query.trim());
  return c.json(suggestions);
});

fuel.get('/cheapest', async (c) => {
  const type = (c.req.query('type') || 'sp98') as FuelType;
  const limit = Number(c.req.query('limit')) || 10;
  
  // Extract query parameters
  const search = c.req.query('search');
  const latStr = c.req.query('lat');
  const lonStr = c.req.query('lon');
  const radiusStr = c.req.query('radius');
  const refresh = c.req.query('refresh') === 'true';
  const fillSizeStr = c.req.query('fillSize');
  const consumptionStr = c.req.query('consumption');

  // Validation
  if (!['sp98', 'sp95', 'e10', 'gazole'].includes(type)) {
    return c.json({ error: 'Invalid fuel type. Use sp98, sp95, e10, or gazole.' }, 400);
  }

  const lat = latStr ? parseFloat(latStr) : undefined;
  const lon = lonStr ? parseFloat(lonStr) : undefined;
  const radius = radiusStr ? parseFloat(radiusStr) : 15; // default 15km
  const fillSize = fillSizeStr && !isNaN(parseFloat(fillSizeStr)) ? parseFloat(fillSizeStr) : undefined;
  const consumption = consumptionStr && !isNaN(parseFloat(consumptionStr)) ? parseFloat(consumptionStr) : undefined;

  if ((latStr && isNaN(lat!)) || (lonStr && isNaN(lon!))) {
    return c.json({ error: 'Latitude and Longitude must be valid numbers.' }, 400);
  }

  const { stations, centerLat, centerLon } = await getCheapestFuel(
    type,
    limit,
    search,
    lat,
    lon,
    radius,
    refresh,
    fillSize,
    consumption
  );
  
  return c.json({
    fuelType: type,
    count: stations.length,
    search: search || null,
    location: centerLat !== undefined && centerLon !== undefined ? { lat: centerLat, lon: centerLon, radius } : null,
    stations,
  });
});

export default fuel;
