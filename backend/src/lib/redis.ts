import { Redis } from 'ioredis';
import { config } from '../config';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    const redisOpts: any = {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    if (config.redis.url) {
      redisInstance = new Redis(config.redis.url, redisOpts);
    } else {
      redisInstance = new Redis({
        ...redisOpts,
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      });
    }

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
