import { Hono } from 'hono';
import { logger } from 'hono/logger';
import fuel from './routes/fuelRoutes';

const app = new Hono();

app.use('*', logger());

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nomadride-backend',
  });
});

// Register fuel routes
app.route('/api/fuel', fuel);

// Example of a modular route
app.get('/api/explore', (c) => {
  return c.json({ message: 'Explore module ready' });
});

export default app;
