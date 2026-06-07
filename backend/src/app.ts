import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import fuel from './routes/fuelRoutes';
import radar from './routes/radarRoutes';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: '*', // We can restrict this later, but * allows easy local development and PWA usage
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nomadride-backend',
  });
});

// Register routes
app.route('/api/fuel', fuel);
app.route('/api/radar', radar);

// Example of a modular route
app.get('/api/explore', (c) => {
  return c.json({ message: 'Explore module ready' });
});

export default app;
