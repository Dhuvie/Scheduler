import { Router, Request, Response } from 'express';
import { getRedis } from '../lib/redis';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {
    redis: 'error',
    database: 'error',
  };

  try {
    await getRedis().ping();
    checks.redis = 'ok';
  } catch (_) {  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (_) {  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok');

  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
