import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import { prisma } from './lib/prisma';
import { getRedis } from './lib/redis';
import { getEmailQueue } from './lib/queue';
import { reconcilePendingEmails } from './services/scheduler';
import campaignRoutes from './routes/campaigns';
import emailRoutes from './routes/emails';
import healthRoutes from './routes/health';

const app = express();


app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


app.use('/api/health', healthRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emails', emailRoutes);


app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});


app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});


async function start() {
  
  await prisma.$connect();
  console.log('[DB] PostgreSQL connected');

  getRedis(); 
  getEmailQueue(); 

  
  await reconcilePendingEmails();

  app.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`);
    console.log(`[Server] Environment: ${config.nodeEnv}`);
    console.log(`[Server] Worker concurrency: ${config.worker.concurrency}`);
    console.log(`[Server] Rate limits: ${config.rateLimits.maxEmailsPerHour}/hr global`);
  });
}


async function shutdown(signal: string) {
  console.log(`[Server] ${signal} received. Shutting down gracefully...`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
  process.exit(1);
});

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});

export default app;
