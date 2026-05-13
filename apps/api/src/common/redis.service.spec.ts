import { RedisService } from './redis.service';

describe('RedisService', () => {
  let redis: RedisService;

  beforeAll(async () => {
    redis = new RedisService();
    await redis.onModuleInit();
  });

  afterAll(async () => {
    await redis.onModuleDestroy();
  });

  it('sets and gets a string with TTL', async () => {
    await redis.setEx('test:key', 10, 'hello');
    const value = await redis.get('test:key');
    expect(value).toBe('hello');
  });

  it('returns null for missing key', async () => {
    const value = await redis.get('test:missing');
    expect(value).toBeNull();
  });

  it('increments a counter', async () => {
    await redis.del('test:counter');
    const v1 = await redis.incr('test:counter');
    const v2 = await redis.incr('test:counter');
    expect(v1).toBe(1);
    expect(v2).toBe(2);
  });
});
