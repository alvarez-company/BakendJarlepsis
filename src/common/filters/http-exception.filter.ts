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

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message,
    };

    // Log detallado del error usando console.error para asegurar que se vea
    console.error('='.repeat(80));
    console.error(`[${request.method}] ${request.url}`);
    console.error('Error Response:', JSON.stringify(errorResponse, null, 2));

    if (exception instanceof Error) {
      console.error('Error Name:', exception.name);
      console.error('Error Message:', exception.message);
      if (exception.stack) {
        console.error('Stack Trace:');
        console.error(exception.stack);
      }
    } else if (exception && typeof exception === 'object') {
      console.error('Exception Object:', JSON.stringify(exception, null, 2));
    } else {
      console.error('Exception:', exception);
    }
    console.error('='.repeat(80));

    // También usar el logger de NestJS
    this.logger.error(
      `${request.method} ${request.url}`,
      JSON.stringify(errorResponse, null, 2),
      'ExceptionFilter',
    );

    if (exception instanceof Error) {
      this.logger.error(`Error: ${exception.message}`, exception.stack, 'ExceptionFilter');
    }

    response.status(status).json(errorResponse);
  }
}
