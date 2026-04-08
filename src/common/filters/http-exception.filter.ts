import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Kesalahan server internal',
      },
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        
        // Handle validation errors from class-validator
        if (Array.isArray(resp.message)) {
          errorResponse = {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Input tidak valid',
              details: (resp.message as string[]).map((msg) => ({
                field: this.extractField(msg),
                message: msg,
              })),
            },
          };
        } else {
          errorResponse = {
            error: {
              code: this.getErrorCode(status),
              message: (resp.message as string) || exception.message,
            },
          };
        }
      } else {
        errorResponse = {
          error: {
            code: this.getErrorCode(status),
            message: exception.message,
          },
        };
      }
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const statusCodes: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'BUSINESS_RULE',
      500: 'INTERNAL_ERROR',
    };
    return statusCodes[status] || 'INTERNAL_ERROR';
  }

  private extractField(message: string): string {
    const match = message.match(/^(\w+)/);
    return match ? match[1].toLowerCase() : 'unknown';
  }
}
