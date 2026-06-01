import { Hono } from 'hono';
import { getCheapestSP98 } from '../services/fuelService';

const fuel = new Hono();

fuel.get('/sp98/cheapest', async (c) => {
  const limit = Number(c.req.query('limit')) || 10;
  const stations = await getCheapestSP98(limit);
  
  return c.json({
    count: stations.length,
    stations,
  });
});

export default fuel;
