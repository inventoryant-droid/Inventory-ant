import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface TracedRequest extends Request {
  id: string;
  startTime: number;
}

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  use(req: TracedRequest, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.id = requestId;
    req.startTime = Date.now();
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
