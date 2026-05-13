import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it('connects to the database and can query users count', async () => {
    const count = await prisma.user.count();
    expect(typeof count).toBe('number');
  });
});
