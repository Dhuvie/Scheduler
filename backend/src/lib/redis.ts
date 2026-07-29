import { Redis } from 'ioredis';
import { config } from '../config';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null, 
      enableReadyCheck: false,
    });

    redisInstance.on('connect', () => {
      console.log('[Redis] Connected');
    });

    redisInstance.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
    });
  }

  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
