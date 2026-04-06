import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private formatMessage(rawMessage: unknown): string {
    if (Array.isArray(rawMessage)) {
      return rawMessage.map(String).join('. ');
    }
    if (typeof rawMessage === 'string') return rawMessage;
    if (rawMessage != null && typeof rawMessage === 'object') {
      return JSON.stringify(rawMessage);
    }
    return 'Erreur inconnue';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Erreur interne du serveur' };

    const body =
      typeof raw === 'object' && raw !== null && 'message' in raw
        ? (raw as { message: unknown })
        : {
            message: String(
              typeof raw === 'object' && raw !== null
                ? JSON.stringify(raw)
                : raw,
            ),
          };

    const message = this.formatMessage(body.message);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
