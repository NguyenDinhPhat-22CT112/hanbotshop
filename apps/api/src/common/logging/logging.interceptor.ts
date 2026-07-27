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

type RequestLogSource = {
    method?: string;
    url?: string;
    headers?: unknown;
    body?: unknown;
};

type ResponseLogSource = {
    statusCode?: number;
    getHeaders?: () => unknown;
};

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

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<RequestLogSource>();
        const response = context.switchToHttp().getResponse<ResponseLogSource>();

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
            catchError((error: unknown) => {
                const duration = Date.now() - startTime;
                const normalizedError = error instanceof Error
                    ? {
                        message: error.message,
                        type: error.constructor.name,
                        stack: error.stack,
                    }
                    : {
                        message: String(error),
                        type: 'UnknownError',
                        stack: undefined,
                    };

                // Capture error data with request context
                const errorData = {
                    error: normalizedError,
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
        return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
}
