import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { TracedRequest } from '../tracing/tracing.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<TracedRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = typeof res === 'object' && res.message ? res.message : exception.message;
      errorCode = this.getErrorCode(status);
    } else if (exception instanceof Error) {
      message = exception.message;
      // Handle generic DB errors or other errors
      if (exception.name === 'PrismaClientKnownRequestError') {
        status = HttpStatus.BAD_REQUEST;
        errorCode = 'DATABASE_CONSTRAINT_ERROR';
      }
    }

    const requestId = request.id || 'N/A';
    const path = request.url || 'N/A';

    // Log the error with Request ID and Path
    this.logger.error(
      `[${requestId}] Error on ${path} (Status: ${status}): ${exception.stack || exception.message || exception}`
    );

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      requestId,
      path,
    });
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.METHOD_NOT_ALLOWED:
        return 'METHOD_NOT_ALLOWED';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.PAYMENT_REQUIRED:
        return 'PAYMENT_REQUIRED';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
