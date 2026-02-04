import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP exception filter for consistent error responses.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status: number;
        let message: string | string[];
        let error: string;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const responseObj = exceptionResponse as Record<string, unknown>;
                message = (responseObj.message as string | string[]) || exception.message;
                error = (responseObj.error as string) || 'Error';
            } else {
                message = exception.message;
                error = 'Error';
            }
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = 'Internal Server Error';

            // Log unexpected errors
            this.logger.error(
                `Unexpected error: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        }

        response.status(status).json({
            statusCode: status,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
