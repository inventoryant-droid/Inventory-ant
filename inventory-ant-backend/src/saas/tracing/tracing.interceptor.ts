import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TracedRequest } from './tracing.middleware';
import { AuditService } from '../../subscription/audit.service';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<TracedRequest>();
    const res = http.getResponse();

    const startTime = Date.now();
    const requestId = req.id || 'N/A';
    const method = req.method;
    const url = req.url;

    return next.handle().pipe(
      tap(async () => {
        const executionTime = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${executionTime}ms`);

        const userAgent = req.headers['user-agent'] || 'Unknown';
        const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
        const device = this.getDeviceFromUA(userAgent);

        // Auto-audit major write operations to enrich the logs
        const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        const shouldAudit = isWriteOperation && !url.includes('/health');

        if (shouldAudit) {
          const userId = req.headers['x-user-id'] as string || 'Guest';
          const action = `${method} ${url.split('?')[0]}`;
          const details = `Request traced: Request ID ${requestId}, processed in ${executionTime}ms.`;
          
          try {
            await this.auditService.logAuditEvent(
              userId === 'Guest' ? null : userId,
              action,
              details,
              userId === 'Guest' ? 'guest' : 'user',
              ip as string,
              undefined,
              requestId,
              executionTime,
              userAgent,
              device
            );
          } catch (err) {
            // Suppress audit error to prevent request blocking, but log it
            console.error('Failed to write enriched audit log in TracingInterceptor:', err.message);
          }
        }
      }),
    );
  }

  private getDeviceFromUA(ua: string): string {
    const lowerUA = ua.toLowerCase();
    if (lowerUA.includes('mobile') || lowerUA.includes('android') || lowerUA.includes('iphone')) {
      return 'Mobile';
    }
    if (lowerUA.includes('tablet') || lowerUA.includes('ipad')) {
      return 'Tablet';
    }
    return 'Desktop';
  }
}
