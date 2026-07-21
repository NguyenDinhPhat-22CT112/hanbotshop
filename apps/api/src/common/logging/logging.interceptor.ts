import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';
import { MaskingService } from './masking.service';

/**
 * HTTP logging interceptor that captures request/response data
 * with correlation IDs, duration tracking, and sensitive data masking
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(
        private readonly logger: PinoLogger,
        private readonly maskingService: MaskingService,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Generate unique correlation ID for request-response tracing
        const correlationId = this.generateCorrelationId();
        const startTime = Date.now();

        // Capture request data
        const requestData = {
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: request.body,
            correlationId,
            timestamp: new Date().toISOString(),
        };

        // Log masked request at info level
        this.logger.info(
            this.maskingService.mask(requestData),
            'HTTP Request',
        );

        return next.handle().pipe(
            tap((responseBody) => {
                const duration = Date.now() - startTime;

                // Capture response data
                const responseData = {
                    statusCode: response.statusCode,
                    headers: response.getHeaders?.() || {},
                    body: responseBody,
                    correlationId,
                    duration,
                    timestamp: new Date().toISOString(),
                };

                // Log masked response at info level
                this.logger.info(
                    this.maskingService.mask(responseData),
                    'HTTP Response',
                );
            }),
            catchError((error) => {
                const duration = Date.now() - startTime;

                // Capture error data with request context
                const errorData = {
                    error: {
                        message: error.message,
                        type: error.constructor?.name || 'Error',
                        stack: error.stack,
                    },
                    request: requestData,
                    correlationId,
                    duration,
                    timestamp: new Date().toISOString(),
                };

                // Log masked error at error level
                this.logger.error(
                    this.maskingService.mask(errorData),
                    'HTTP Error',
                );

                // Re-throw error to allow error handling middleware to process it
                return throwError(() => error);
            }),
        );
    }

    /**
     * Generate unique correlation ID combining timestamp and random component
     * Format: {timestamp}-{random-string}
     * @returns Unique correlation identifier
     */
    private generateCorrelationId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
