import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecuritySanitizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.body) {
      req.body = this.sanitize(req.body);
    }
    if (req.query) {
      for (const key of Object.keys(req.query)) {
        req.query[key] = this.sanitize(req.query[key]);
      }
    }
    if (req.params) {
      for (const key of Object.keys(req.params)) {
        req.params[key] = this.sanitize(req.params[key]);
      }
    }
    next();
  }

  private sanitize(input: any): any {
    if (typeof input === 'string') {
      // Basic defense-in-depth: strip out script tags and HTML elements that could be malicious
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/[<>]/g, (match) => {
          if (match === '<') return '&lt;';
          if (match === '>') return '&gt;';
          return match;
        });
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitize(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitizedObj: any = {};
      for (const key of Object.keys(input)) {
        sanitizedObj[key] = this.sanitize(input[key]);
      }
      return sanitizedObj;
    }

    return input;
  }
}
