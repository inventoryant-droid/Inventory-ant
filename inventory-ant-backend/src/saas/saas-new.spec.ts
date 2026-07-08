import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache/cache.service';
import { MemoryCacheProvider } from './cache/memory-cache.provider';
import { StorageService } from './storage/storage.service';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { RateLimiterGuard } from './security/rate-limiter.guard';
import { GlobalExceptionFilter } from './errors/global-exception.filter';
import { SecuritySanitizationMiddleware } from './security/security.middleware';
import { TracingMiddleware } from './tracing/tracing.middleware';
import { TracingInterceptor } from './tracing/tracing.interceptor';
import { AuditService } from '../subscription/audit.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

describe('SaaS Phase 7B New Modules', () => {
  // 1. Cache Layer Testing
  describe('Cache Layer', () => {
    let cacheService: CacheService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CacheService,
          {
            provide: 'CacheProvider',
            useClass: MemoryCacheProvider,
          },
        ],
      }).compile();
      cacheService = module.get<CacheService>(CacheService);
    });

    it('should set and get values from cache', async () => {
      await cacheService.set('test-key', 'test-value', 5);
      const val = await cacheService.get<string>('test-key');
      expect(val).toBe('test-value');
    });

    it('should expire values after TTL', async () => {
      await cacheService.set('expire-key', 'value', -1); // Expired immediately
      const val = await cacheService.get<string>('expire-key');
      expect(val).toBeNull();
    });

    it('should wrap execution and cache results', async () => {
      const mockFn = jest.fn().mockResolvedValue('fresh-data');
      const val1 = await cacheService.wrap('wrap-key', mockFn, 5);
      const val2 = await cacheService.wrap('wrap-key', mockFn, 5);
      
      expect(val1).toBe('fresh-data');
      expect(val2).toBe('fresh-data');
      expect(mockFn).toHaveBeenCalledTimes(1); // Second call resolved from cache
    });
  });

  // 2. Storage Layer Testing
  describe('Storage Layer', () => {
    let storageService: StorageService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          {
            provide: 'StorageProvider',
            useClass: LocalStorageProvider,
          },
        ],
      }).compile();
      storageService = module.get<StorageService>(StorageService);
    });

    afterAll(async () => {
      // Cleanup uploads test directory
      const testFilePath = path.join(process.cwd(), 'uploads', 'test-bucket', 'test-file.txt');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      const testBucketDir = path.join(process.cwd(), 'uploads', 'test-bucket');
      if (fs.existsSync(testBucketDir)) {
        fs.rmdirSync(testBucketDir);
      }
    });

    it('should save and verify existence of file', async () => {
      const content = Buffer.from('hello storage');
      const pathUrl = await storageService.saveFile('test-bucket', 'test-file.txt', content, 'text/plain');
      expect(pathUrl).toBe('/uploads/test-bucket/test-file.txt');

      const exists = await storageService.fileExists('test-bucket', 'test-file.txt');
      expect(exists).toBe(true);

      const buffer = await storageService.getFile('test-bucket', 'test-file.txt');
      expect(buffer.toString()).toBe('hello storage');

      await storageService.deleteFile('test-bucket', 'test-file.txt');
      const existsAfterDelete = await storageService.fileExists('test-bucket', 'test-file.txt');
      expect(existsAfterDelete).toBe(false);
    });
  });

  // 3. Security Sanitization Middleware Testing
  describe('Security Sanitization Middleware', () => {
    let middleware: SecuritySanitizationMiddleware;

    beforeEach(() => {
      middleware = new SecuritySanitizationMiddleware();
    });

    it('should strip script tags from request body', () => {
      const req = {
        body: {
          username: 'admin',
          bio: '<script>alert("hack")</script>I am a developer',
        },
        query: {},
        params: {},
      } as any;
      const res = {} as any;
      const next = jest.fn();

      middleware.use(req, res, next);
      expect(req.body.bio).toBe('I am a developer');
      expect(next).toHaveBeenCalled();
    });

    it('should escape HTML tags in strings', () => {
      const req = {
        body: {
          title: '<h1>Testing</h1>',
        },
        query: {},
        params: {},
      } as any;
      const res = {} as any;
      const next = jest.fn();

      middleware.use(req, res, next);
      expect(req.body.title).toBe('&lt;h1&gt;Testing&lt;/h1&gt;');
    });
  });

  // 4. Rate Limiter Guard Testing
  describe('Rate Limiter Guard', () => {
    let guard: RateLimiterGuard;
    let cacheService: CacheService;
    let reflector: Reflector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RateLimiterGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn().mockReturnValue(null),
            },
          },
          {
            provide: CacheService,
            useValue: {
              get: jest.fn(),
              set: jest.fn(),
            },
          },
        ],
      }).compile();

      guard = module.get<RateLimiterGuard>(RateLimiterGuard);
      cacheService = module.get<CacheService>(CacheService);
      reflector = module.get<Reflector>(Reflector);
    });

    it('should allow request if under rate limit', async () => {
      const req = {
        url: '/api/v1/health',
        headers: {},
        ip: '192.168.1.1',
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      jest.spyOn(cacheService, 'get').mockResolvedValue(2); // 2 hits so far
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should throw Too Many Requests exception if limit is exceeded', async () => {
      const req = {
        url: '/api/v1/auth/login',
        headers: {},
        ip: '192.168.1.1',
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
        points: 5,
        duration: 60,
        limitBy: 'ip',
      });
      jest.spyOn(cacheService, 'get').mockResolvedValue(5); // already 5 hits

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });
  });

  // 5. Centralized Exception Filter Testing
  describe('Global Exception Filter', () => {
    let filter: GlobalExceptionFilter;

    beforeEach(() => {
      filter = new GlobalExceptionFilter();
    });

    it('should format HttpException correctly', () => {
      const mockJson = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      const host = {
        switchToHttp: () => ({
          getResponse: () => ({
            status: mockStatus,
          }),
          getRequest: () => ({
            id: 'trace-1234',
            url: '/test-route',
          }),
        }),
      } as any;

      const exception = new HttpException('Forbidden Resource', HttpStatus.FORBIDDEN);
      filter.catch(exception, host);

      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        errorCode: 'FORBIDDEN',
        message: 'Forbidden Resource',
        requestId: 'trace-1234',
        path: '/test-route',
      }));
    });
  });

  // 6. Tracing Middleware & Interceptor Testing
  describe('Request Tracing & Versioning', () => {
    it('should attach x-request-id header in middleware', () => {
      const middleware = new TracingMiddleware();
      const req = { headers: {} } as any;
      const res = { setHeader: jest.fn() } as any;
      const next = jest.fn();

      middleware.use(req, res, next);

      expect(req.id).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.id);
      expect(next).toHaveBeenCalled();
    });

    it('should compute and append response time in interceptor', async () => {
      const mockAuditService = {
        logAuditEvent: jest.fn().mockResolvedValue({}),
      } as any;

      const interceptor = new TracingInterceptor(mockAuditService);
      const req = {
        id: 'trace-123',
        method: 'GET',
        url: '/api/v1/health',
        headers: {},
        ip: '127.0.0.1',
      } as any;
      const res = { setHeader: jest.fn() } as any;

      const context = {
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => res,
        }),
      } as ExecutionContext;

      const next = {
        handle: () => of('result'),
      } as CallHandler;

      await interceptor.intercept(context, next).toPromise();

      expect(res.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.stringContaining('ms'));
    });
  });
});
