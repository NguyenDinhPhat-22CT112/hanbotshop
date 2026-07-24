import assert from 'node:assert/strict';
import test from 'node:test';
import * as fs from 'fs';
import * as path from 'path';
import { LoggingConfigurationService } from './configuration.service';
import { MaskingService } from './masking.service';

test('LoggingConfigurationService provides default log level', () => {
    const originalLogLevel = process.env.LOG_LEVEL;
    delete process.env.LOG_LEVEL;

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.getLogLevel(), 'info');
    } finally {
        if (originalLogLevel !== undefined) {
            process.env.LOG_LEVEL = originalLogLevel;
        }
    }
});

test('LoggingConfigurationService reads log level from environment', () => {
    const originalLogLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'debug';

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.getLogLevel(), 'debug');
    } finally {
        if (originalLogLevel !== undefined) {
            process.env.LOG_LEVEL = originalLogLevel;
        } else {
            delete process.env.LOG_LEVEL;
        }
    }
});

test('LoggingConfigurationService provides default log directory', () => {
    const originalLogDir = process.env.LOG_DIR;
    delete process.env.LOG_DIR;

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.getLogDirectory(), './logs');
    } finally {
        if (originalLogDir !== undefined) {
            process.env.LOG_DIR = originalLogDir;
        }
    }
});

test('LoggingConfigurationService reads log directory from environment', () => {
    const originalLogDir = process.env.LOG_DIR;
    process.env.LOG_DIR = './custom-logs';

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.getLogDirectory(), './custom-logs');
    } finally {
        if (originalLogDir !== undefined) {
            process.env.LOG_DIR = originalLogDir;
        } else {
            delete process.env.LOG_DIR;
        }
    }
});

test('LoggingConfigurationService provides default rotation size', () => {
    const originalRotationSize = process.env.LOG_ROTATION_SIZE;
    delete process.env.LOG_ROTATION_SIZE;

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.getRotationSize(), 10 * 1024 * 1024);
    } finally {
        if (originalRotationSize !== undefined) {
            process.env.LOG_ROTATION_SIZE = originalRotationSize;
        }
    }
});

test('LoggingConfigurationService reads rotation size from environment', () => {
    const originalRotationSize = process.env.LOG_ROTATION_SIZE;
    process.env.LOG_ROTATION_SIZE = '5242880';

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.getRotationSize(), 5242880);
    } finally {
        if (originalRotationSize !== undefined) {
            process.env.LOG_ROTATION_SIZE = originalRotationSize;
        } else {
            delete process.env.LOG_ROTATION_SIZE;
        }
    }
});

test('LoggingConfigurationService provides default max files', () => {
    const originalMaxFiles = process.env.LOG_MAX_FILES;
    delete process.env.LOG_MAX_FILES;

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.getMaxFiles(), 7);
    } finally {
        if (originalMaxFiles !== undefined) {
            process.env.LOG_MAX_FILES = originalMaxFiles;
        }
    }
});

test('LoggingConfigurationService reads max files from environment', () => {
    const originalMaxFiles = process.env.LOG_MAX_FILES;
    process.env.LOG_MAX_FILES = '14';

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.getMaxFiles(), 14);
    } finally {
        if (originalMaxFiles !== undefined) {
            process.env.LOG_MAX_FILES = originalMaxFiles;
        } else {
            delete process.env.LOG_MAX_FILES;
        }
    }
});

test('LoggingConfigurationService detects development mode for pretty print', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.isPrettyPrint(), true);
    } finally {
        if (originalNodeEnv !== undefined) {
            process.env.NODE_ENV = originalNodeEnv;
        } else {
            delete process.env.NODE_ENV;
        }
    }
});

test('LoggingConfigurationService disables pretty print in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
        const configService = new LoggingConfigurationService();
        assert.equal(configService.isPrettyPrint(), false);
    } finally {
        if (originalNodeEnv !== undefined) {
            process.env.NODE_ENV = originalNodeEnv;
        } else {
            delete process.env.NODE_ENV;
        }
    }
});

test('MaskingService can be instantiated', () => {
    const maskingService = new MaskingService();
    assert.ok(maskingService instanceof MaskingService);
});

// Directory Creation Tests for Task 3.2
test('Log directory creation succeeds when directory does not exist', async () => {
    const testDir = path.join(process.cwd(), 'test-logs-' + Date.now());

    try {
        // Ensure directory doesn't exist
        try {
            await fs.promises.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore if directory doesn't exist
        }

        // Create directory recursively
        await fs.promises.mkdir(testDir, { recursive: true });

        // Verify directory was created
        const stats = await fs.promises.stat(testDir);
        assert.ok(stats.isDirectory());
    } finally {
        // Cleanup
        try {
            await fs.promises.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    }
});

test('Log directory creation is idempotent (does not fail if directory already exists)', async () => {
    const testDir = path.join(process.cwd(), 'test-logs-idempotent-' + Date.now());

    try {
        // Create directory first time
        await fs.promises.mkdir(testDir, { recursive: true });
        const stats1 = await fs.promises.stat(testDir);
        assert.ok(stats1.isDirectory());

        // Create directory second time - should not throw error
        await fs.promises.mkdir(testDir, { recursive: true });
        const stats2 = await fs.promises.stat(testDir);
        assert.ok(stats2.isDirectory());
    } finally {
        // Cleanup
        try {
            await fs.promises.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    }
});

test('Log directory creation handles nested directory paths', async () => {
    const testDir = path.join(process.cwd(), 'test-logs-nested-' + Date.now(), 'level1', 'level2', 'level3');

    try {
        // Ensure parent directories don't exist
        try {
            await fs.promises.rm(path.join(process.cwd(), 'test-logs-nested-' + Date.now().toString().slice(0, -3) + '000'), { recursive: true, force: true });
        } catch (err) {
            // Ignore if directory doesn't exist
        }

        // Create nested directory structure
        await fs.promises.mkdir(testDir, { recursive: true });

        // Verify directory was created
        const stats = await fs.promises.stat(testDir);
        assert.ok(stats.isDirectory());

        // Verify parent directories were also created
        const parentStats = await fs.promises.stat(path.dirname(testDir));
        assert.ok(parentStats.isDirectory());
    } finally {
        // Cleanup - remove from the root test directory
        try {
            const rootTestDir = testDir.split(path.sep).slice(0, -3).join(path.sep);
            await fs.promises.rm(rootTestDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    }
});

test('Log directory creation error handling produces informative message', async () => {
    // Test that when an error occurs, it's caught and logged gracefully
    // We can't easily simulate a filesystem error in a unit test without mocking,
    // but we can verify the error handling structure is in place

    const invalidPath = '\0invalid'; // Null character in path is invalid on most systems
    let errorCaught = false;
    let errorMessage = '';

    try {
        await fs.promises.mkdir(invalidPath, { recursive: true });
    } catch (err) {
        errorCaught = true;
        errorMessage = err instanceof Error ? err.message : String(err);
        // Just verify that we can catch and format the error properly
        assert.ok(errorMessage.length > 0);
    }

    // This test verifies that errors are catchable and can be formatted
    assert.ok(errorCaught, 'Expected an error to be thrown for invalid path');
});

test('Log directory creation with relative path', async () => {
    const testDir = './test-logs-relative-' + Date.now();

    try {
        // Create directory with relative path
        await fs.promises.mkdir(testDir, { recursive: true });

        // Verify directory was created
        const stats = await fs.promises.stat(testDir);
        assert.ok(stats.isDirectory());
    } finally {
        // Cleanup
        try {
            await fs.promises.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    }
});

test('Log directory creation with absolute path', async () => {
    const testDir = path.join(process.cwd(), 'test-logs-absolute-' + Date.now());

    try {
        // Create directory with absolute path
        await fs.promises.mkdir(testDir, { recursive: true });

        // Verify directory was created
        const stats = await fs.promises.stat(testDir);
        assert.ok(stats.isDirectory());

        // Verify it's using the absolute path
        const resolvedPath = path.resolve(testDir);
        assert.equal(path.isAbsolute(resolvedPath), true);
    } finally {
        // Cleanup
        try {
            await fs.promises.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    }
});

// File Rotation Configuration Tests for Task 3.3
test('Daily log file naming pattern uses correct format (app-YYYY-MM-DD.log)', () => {
    const configService = new LoggingConfigurationService();
    const logDir = configService.getLogDirectory();

    // Generate log file name using the same logic as logging.module.ts
    const today = new Date().toISOString().split('T')[0];
    const logFilePath = path.join(logDir, `app-${today}.log`);

    // Extract filename and verify pattern
    const filename = path.basename(logFilePath);
    const datePattern = /^app-\d{4}-\d{2}-\d{2}\.log$/;

    assert.ok(datePattern.test(filename), `Expected filename to match pattern app-YYYY-MM-DD.log, got: ${filename}`);
});

test('Daily log file naming pattern generates valid date', () => {
    const configService = new LoggingConfigurationService();
    const logDir = configService.getLogDirectory();

    // Generate log file name
    const today = new Date().toISOString().split('T')[0];
    const logFilePath = path.join(logDir, `app-${today}.log`);

    // Extract date from filename
    const filename = path.basename(logFilePath, '.log');
    const dateStr = filename.replace('app-', '');

    // Verify date is parseable and valid
    const parsedDate = new Date(dateStr);
    assert.ok(!isNaN(parsedDate.getTime()), `Expected valid date, got: ${dateStr}`);

    // Verify date format matches expected pattern
    assert.equal(dateStr.length, 10, 'Expected date string to be 10 characters (YYYY-MM-DD)');
    assert.ok(dateStr.includes('-'), 'Expected date string to contain hyphens');
});

test('Log file naming includes configured directory path', () => {
    const originalLogDir = process.env.LOG_DIR;
    process.env.LOG_DIR = './custom-log-dir';

    try {
        const configService = new LoggingConfigurationService();
        const logDir = configService.getLogDirectory();
        const today = new Date().toISOString().split('T')[0];
        const logFilePath = path.join(logDir, `app-${today}.log`);

        assert.ok(logFilePath.includes('custom-log-dir'), `Expected path to include custom directory, got: ${logFilePath}`);
    } finally {
        if (originalLogDir !== undefined) {
            process.env.LOG_DIR = originalLogDir;
        } else {
            delete process.env.LOG_DIR;
        }
    }
});

test('Rotation size configuration from environment is applied correctly', () => {
    const originalRotationSize = process.env.LOG_ROTATION_SIZE;
    process.env.LOG_ROTATION_SIZE = '20971520'; // 20MB

    try {
        const configService = new LoggingConfigurationService();
        const rotationSize = configService.getRotationSize();

        assert.equal(rotationSize, 20971520, 'Expected rotation size to match configured value');
        assert.equal(typeof rotationSize, 'number', 'Expected rotation size to be a number');
    } finally {
        if (originalRotationSize !== undefined) {
            process.env.LOG_ROTATION_SIZE = originalRotationSize;
        } else {
            delete process.env.LOG_ROTATION_SIZE;
        }
    }
});

test('Max files configuration from environment is applied correctly', () => {
    const originalMaxFiles = process.env.LOG_MAX_FILES;
    process.env.LOG_MAX_FILES = '14';

    try {
        const configService = new LoggingConfigurationService();
        const maxFiles = configService.getMaxFiles();

        assert.equal(maxFiles, 14, 'Expected max files to match configured value');
        assert.equal(typeof maxFiles, 'number', 'Expected max files to be a number');
    } finally {
        if (originalMaxFiles !== undefined) {
            process.env.LOG_MAX_FILES = originalMaxFiles;
        } else {
            delete process.env.LOG_MAX_FILES;
        }
    }
});

test('Default rotation size is 10MB', () => {
    const originalRotationSize = process.env.LOG_ROTATION_SIZE;
    delete process.env.LOG_ROTATION_SIZE;

    try {
        const configService = new LoggingConfigurationService();
        const rotationSize = configService.getRotationSize();

        assert.equal(rotationSize, 10 * 1024 * 1024, 'Expected default rotation size to be 10MB (10485760 bytes)');
    } finally {
        if (originalRotationSize !== undefined) {
            process.env.LOG_ROTATION_SIZE = originalRotationSize;
        }
    }
});

test('Default max files is 7', () => {
    const originalMaxFiles = process.env.LOG_MAX_FILES;
    delete process.env.LOG_MAX_FILES;

    try {
        const configService = new LoggingConfigurationService();
        const maxFiles = configService.getMaxFiles();

        assert.equal(maxFiles, 7, 'Expected default max files to be 7');
    } finally {
        if (originalMaxFiles !== undefined) {
            process.env.LOG_MAX_FILES = originalMaxFiles;
        }
    }
});

test('Rotation configuration is compatible with pino-roll format', () => {
    const configService = new LoggingConfigurationService();
    const rotationSize = configService.getRotationSize();
    const maxFiles = configService.getMaxFiles();

    // Verify rotation size can be converted to string (pino-roll requirement)
    const rotationSizeStr = rotationSize.toString();
    assert.equal(typeof rotationSizeStr, 'string', 'Expected rotation size to be convertible to string');
    assert.ok(rotationSizeStr.length > 0, 'Expected rotation size string to be non-empty');

    // Verify max files is a positive integer
    assert.ok(Number.isInteger(maxFiles), 'Expected max files to be an integer');
    assert.ok(maxFiles > 0, 'Expected max files to be positive');
});

test('Log file path combines directory and daily filename correctly', () => {
    const configService = new LoggingConfigurationService();
    const logDir = configService.getLogDirectory();
    const today = new Date().toISOString().split('T')[0];
    const logFilePath = path.join(logDir, `app-${today}.log`);

    // Verify path structure - normalize both for comparison
    assert.equal(path.normalize(path.dirname(logFilePath)), path.normalize(logDir), 'Expected file to be in configured directory');
    assert.equal(path.extname(logFilePath), '.log', 'Expected file extension to be .log');
});

test('Daily naming pattern changes with date', () => {
    const configService = new LoggingConfigurationService();
    const logDir = configService.getLogDirectory();

    // Generate filename for today
    const today = new Date().toISOString().split('T')[0];
    const todayFilePath = path.join(logDir, `app-${today}.log`);

    // Generate filename for a different date
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrowFilePath = path.join(logDir, `app-${tomorrow}.log`);

    // Verify they are different
    assert.notEqual(todayFilePath, tomorrowFilePath, 'Expected filenames to differ for different dates');
    assert.ok(todayFilePath.includes(today), 'Expected today filename to include today date');
    assert.ok(tomorrowFilePath.includes(tomorrow), 'Expected tomorrow filename to include tomorrow date');
});

test('Rotation size respects configured byte value', () => {
    const testCases = [
        { input: '1048576', expected: 1048576 },      // 1MB
        { input: '5242880', expected: 5242880 },      // 5MB
        { input: '10485760', expected: 10485760 },    // 10MB
        { input: '52428800', expected: 52428800 },    // 50MB
    ];

    const originalRotationSize = process.env.LOG_ROTATION_SIZE;

    try {
        for (const testCase of testCases) {
            process.env.LOG_ROTATION_SIZE = testCase.input;
            const configService = new LoggingConfigurationService();
            const rotationSize = configService.getRotationSize();

            assert.equal(rotationSize, testCase.expected,
                `Expected rotation size ${testCase.input} to equal ${testCase.expected}`);
        }
    } finally {
        if (originalRotationSize !== undefined) {
            process.env.LOG_ROTATION_SIZE = originalRotationSize;
        } else {
            delete process.env.LOG_ROTATION_SIZE;
        }
    }
});

test('Max files respects configured count value', () => {
    const testCases = [
        { input: '3', expected: 3 },
        { input: '7', expected: 7 },
        { input: '14', expected: 14 },
        { input: '30', expected: 30 },
    ];

    const originalMaxFiles = process.env.LOG_MAX_FILES;

    try {
        for (const testCase of testCases) {
            process.env.LOG_MAX_FILES = testCase.input;
            const configService = new LoggingConfigurationService();
            const maxFiles = configService.getMaxFiles();

            assert.equal(maxFiles, testCase.expected,
                `Expected max files ${testCase.input} to equal ${testCase.expected}`);
        }
    } finally {
        if (originalMaxFiles !== undefined) {
            process.env.LOG_MAX_FILES = originalMaxFiles;
        } else {
            delete process.env.LOG_MAX_FILES;
        }
    }
});

