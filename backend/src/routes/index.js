import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import characterRoutes from './character.routes.js';
import shopRoutes from './shop.routes.js';
import statsRoutes from './stats.routes.js';
import taskRoutes from './task.routes.js';

const router = Router();

/**
 * Liveness + readiness in one. Render and Railway poll this; it reports the
 * Mongo connection state so a green process with a dead database still reads
 * as unhealthy rather than quietly serving 500s.
 */
router.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] ?? 'unknown';
  const healthy = mongoose.connection.readyState === 1;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      service: 'hearthlog-api',
      status: healthy ? 'ok' : 'degraded',
      database: state,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

/** A tiny index so hitting the API root in a browser is not a dead end. */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Hearthlog API',
      version: 'v1',
      docs: 'https://github.com/',
      endpoints: [
        'POST   /auth/register',
        'POST   /auth/login',
        'POST   /auth/refresh',
        'POST   /auth/logout',
        'GET    /auth/me',
        'GET    /tasks',
        'POST   /tasks',
        'GET    /tasks/today',
        'GET    /tasks/:id',
        'PATCH  /tasks/:id',
        'DELETE /tasks/:id',
        'POST   /tasks/:id/complete',
        'POST   /tasks/:id/reopen',
        'POST   /tasks/reorder',
        'GET    /character',
        'GET    /character/rules',
        'PATCH  /character/preferences',
        'GET    /shop/items',
        'GET    /shop/inventory',
        'POST   /shop/purchase',
        'POST   /shop/equip',
        'GET    /stats/summary',
        'GET    /stats/activity',
      ],
    },
  });
});

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/character', characterRoutes);
router.use('/shop', shopRoutes);
router.use('/stats', statsRoutes);

export default router;
