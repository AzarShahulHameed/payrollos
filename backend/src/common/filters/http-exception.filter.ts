import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const req  = ctx.getRequest<Request>();
    const res  = ctx.getResponse<Response>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code    = 'INTERNAL_ERROR';

    if (exception instanceof ThrottlerException) {
      status  = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Too many requests. Please slow down and try again shortly.';
      code    = 'RATE_LIMITED';
      res.setHeader('Retry-After', '60');
    } else if (exception instanceof HttpException) {
      status  = exception.getStatus();
      const resp = exception.getResponse();
      message = typeof resp === 'string' ? resp : (resp as any)?.message || message;
      code    = (resp as any)?.error || `HTTP_${status}`;
      // Normalise validation error arrays
      if (Array.isArray(message)) {
        message = message.join(', ');
      }
    } else if (exception instanceof Error) {
      // Never expose raw error messages in production
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
      this.logger.error(`${req.method} ${req.url} — ${exception.message}`, exception.stack);
    }

    res.status(status).json({
      statusCode: status,
      error:      code,
      message,
      timestamp:  new Date().toISOString(),
      path:       req.url,
    });
  }
}
