import { Injectable } from '@nestjs/common';

/**
 * Configuration service for logging system
 * Reads and validates logging configuration from environment variables
 */
@Injectable()
export class LoggingConfigurationService {
    /**
     * Get the minimum log level
     * @returns Log level (trace, debug, info, warn, error, fatal)
     * @default 'info'
     */
    getLogLevel(): string {
        return process.env.LOG_LEVEL || 'info';
    }

    /**
     * Get the log directory path
     * @returns Directory path where log files will be stored
     * @default './logs'
     */
    getLogDirectory(): string {
        return process.env.LOG_DIR || './logs';
    }

    /**
     * Get the log file rotation size threshold in bytes
     * @returns Size in bytes (default 10MB)
     * @default 10485760
     */
    getRotationSize(): number {
        const size = process.env.LOG_ROTATION_SIZE;
        return size ? parseInt(size, 10) : 10 * 1024 * 1024; // 10MB default
    }

    /**
     * Get the maximum number of rotated log files to keep
     * @returns Maximum number of files
     * @default 7
     */
    getMaxFiles(): number {
        const max = process.env.LOG_MAX_FILES;
        return max ? parseInt(max, 10) : 7; // 7 days default
    }

    /**
     * Check if pretty-print should be enabled
     * @returns True if running in development mode
     */
    isPrettyPrint(): boolean {
        return process.env.NODE_ENV === 'development';
    }
}
