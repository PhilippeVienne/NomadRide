import { Hono } from 'hono';
import { getCheapestFuel, FuelType } from '../services/fuelService';

const fuel = new Hono();

fuel.get('/cheapest', async (c) => {
  const type = (c.req.query('type') || 'sp98') as FuelType;
  const limit = Number(c.req.query('limit')) || 10;

  if (!['sp98', 'sp95', 'e10'].includes(type)) {
    return c.json({ error: 'Invalid fuel type. Use sp98, sp95, or e10.' }, 400);
  }

  const stations = await getCheapestFuel(type, limit);
  
  return c.json({
    fuelType: type,
    count: stations.length,
    stations,
  });
});

export default fuel;
