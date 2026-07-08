import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../../prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: PrismaService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    subscription: {
      count: jest.fn(),
    },
    auditEvent: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return database UP status on success queryRaw', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([1]);

    const res = await service.checkDatabase();
    expect(res.status).toBe('UP');
    expect(res.latencyMs).toBeDefined();
  });

  it('should return database DOWN status and log failure audit on error', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection Failed'));

    const res = await service.checkDatabase();
    expect(res.status).toBe('DOWN');
    expect(res.error).toBe('Connection Failed');
    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'Health Failure',
      }),
    }));
  });
});
