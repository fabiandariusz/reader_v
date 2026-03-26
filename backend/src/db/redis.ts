import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  lazyConnect: true,
});

redis.on('error', (err) => {
  // Non-fatal — app works without cache
  console.warn('Redis error (non-fatal):', err.message);
});

export default redis;
