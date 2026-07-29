import { getRedis } from './redis';

function getRateLimitKey(campaignId: string, sender: string): string {
  const now = new Date();
  const window = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}`;
  return `rate:emails:${campaignId}:${sender}:${window}`;
}

const LUA_RATE_CHECK = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current and tonumber(current) >= limit then
  return -1
end

local count = redis.call('INCR', key)
if count == 1 then
  redis.call('EXPIRE', key, ttl)
end
return count
`;

export interface RateLimitResult {
  allowed: boolean;
  currentCount?: number;
  retryAfterMs?: number;
}

export async function checkAndConsumeRateLimit(
  campaignId: string,
  sender: string,
  hourlyLimit: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const key = getRateLimitKey(campaignId, sender);
  const ttlSeconds = 7200; 

  const result = await redis.eval(
    LUA_RATE_CHECK,
    1,
    key,
    String(hourlyLimit),
    String(ttlSeconds),
  ) as number;

  if (result === -1) {
    
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
    const retryAfterMs = nextHour.getTime() - now.getTime();

    return { allowed: false, retryAfterMs };
  }

  return { allowed: true, currentCount: result };
}

