import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import * as path from 'path';
import * as fs from 'fs';
import { LoggingConfigurationService } from './configuration.service';
import { MaskingService } from './masking.service';

type SerializedRequest = {
    method?: string;
    url?: string;
    headers?: unknown;
    remoteAddress?: string;
    remotePort?: number;
};

type SerializedResponse = {
    statusCode?: number;
    headers?: unknown;
    getHeaders?: () => unknown;
};

type SerializedError = {
    constructor?: { name?: string };
    message?: string;
    stack?: string;
};

/**
 * Logging module that configures Pino logger with dual transport
 * Provides structured logging with JSON formatting, automatic file rotation,
 * and pretty-print console output for development
 */
@Module({
    imports: [
        LoggerModule.forRootAsync({
            inject: [LoggingConfigurationService],
            useFactory: async (config: LoggingConfigurationService) => {
                const logLevel = config.getLogLevel();
                const logDir = config.getLogDirectory();
                const isPrettyPrint = config.isPrettyPrint();

                // Ensure log directory exists - create it recursively if missing
                // This is done before logger initialization to ensure the file transport has a valid destination
                try {
                    await fs.promises.mkdir(logDir, { recursive: true });
                } catch (err) {
                    // Log the error to stderr but don't throw - the application can still function with console-only logging
                    // The file transport will handle subsequent write errors gracefully
                    console.error(`Warning: Failed to create log directory '${logDir}':`, err instanceof Error ? err.message : String(err));
                }

                // Generate daily log file name: app-YYYY-MM-DD.log
                const today = new Date().toISOString().split('T')[0];
                const logFilePath = path.join(logDir, `app-${today}.log`);

                return {
                    pinoHttp: {
                        level: logLevel,
                        // Format log levels as strings instead of numbers
                        formatters: {
                            level: (label: string) => ({ level: label }),
                        },
                        // Dual transport configuration
                        transport: {
                            targets: [
                                isPrettyPrint ? {
                                    target: 'pino-pretty',
                                    level: logLevel,
                                    options: {
                                        colorize: true,
                                        translateTime: 'SYS:standard',
                                        ignore: 'pid,hostname',
                                        singleLine: false,
                                    },
                                } : {
                                    target: 'pino/file',
                                    level: logLevel,
                                    options: {
                                        destination: 1,
                                    },
                                },
                                // File transport with rotation using pino-roll
                                {
                                    target: 'pino-roll',
                                    level: logLevel,
                                    options: {
                                        file: logFilePath,
                                        frequency: 'daily',
                                        size: config.getRotationSize().toString(),
                                        limit: { count: config.getMaxFiles() },
                                        mkdir: true,
                                    },
                                },
                            ],
                        },
                        // Custom serializers for request/response
                        serializers: {
                            req: (req: SerializedRequest) => ({
                                method: req.method,
                                url: req.url,
                                headers: req.headers,
                                remoteAddress: req.remoteAddress,
                                remotePort: req.remotePort,
                            }),
                            res: (res: SerializedResponse) => ({
                                statusCode: res.statusCode,
                                headers: res.getHeaders?.() || res.headers,
                            }),
                            err: (err: SerializedError) => ({
                                type: err.constructor?.name || 'Error',
                                message: err.message,
                                stack: err.stack,
                            }),
                        },
                        // Auto-logging disabled - we'll use interceptor for granular control
                        autoLogging: false,
                    },
                };
            },
        }),
    ],
    providers: [LoggingConfigurationService, MaskingService],
    exports: [LoggingConfigurationService, MaskingService],
})
export class LoggingModule { }
