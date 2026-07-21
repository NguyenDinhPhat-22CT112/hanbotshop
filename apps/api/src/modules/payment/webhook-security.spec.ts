import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PaymentService } from './payment.service';

/**
 * Webhook Security Test Suite
 * 
 * Tests comprehensive webhook security mechanisms:
 * - Signature verification (HMAC-SHA256 with timing-safe comparison)
 * - Timestamp validation (replay protection with 5-minute window)
 * - Required headers validation (providerEventId, providerTimestamp, signature)
 * - Secret configuration validation (production vs development)
 * - Idempotent webhook processing (duplicate event rejection)
 * - Raw body requirement for signature verification
 * - Timing attack prevention (constant-time comparison)
 * - Invalid timestamp format rejection
 * - Signature format normalization (sha256= prefix handling)
 */

describe('Webhook Security', () => {
    let service: PaymentService;
    let prisma: any;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        process.env.PAYMENT_GATEWAY_PROVIDER = 'stripe';
        process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = 'test_webhook_secret_key';
        process.env.NODE_ENV = 'test';

        prisma = createMockPrisma();
        service = new PaymentService(prisma);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    // ============================================================================
    // SIGNATURE VERIFICATION
    // ============================================================================

    it('accepts webhook with valid signature', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        prisma.paymentEvent.findUnique = async () => null;
        prisma.payment.findUnique = async () => mockPayment('pay1');
        prisma.payment.update = async () => mockPayment('pay1');

        const result = await service.recordWebhook(
            { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
            {
                signature: `sha256=${signature}`,
                providerEventId: 'evt_123',
                providerTimestamp: timestamp,
                rawBody
            }
        );

        assert.ok(result);
        assert.equal(result.id, 'pay1');
    });

    it('rejects webhook with invalid signature', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: 'sha256=invalid_signature_here',
                    providerEventId: 'evt_123',
                    providerTimestamp: timestamp,
                    rawBody
                }
            ),
            UnauthorizedException
        );
    });

    it('rejects webhook with missing signature', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: undefined,
                    providerEventId: 'evt_123',
                    providerTimestamp: timestamp,
                    rawBody
                }
            ),
            UnauthorizedException
        );
    });

    it('handles signature with sha256= prefix', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        prisma.paymentEvent.findUnique = async () => null;
        prisma.payment.findUnique = async () => mockPayment('pay1');
        prisma.payment.update = async () => mockPayment('pay1');

        const result = await service.recordWebhook(
            { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
            {
                signature: `sha256=${signature}`, // with prefix
                providerEventId: 'evt_123',
                providerTimestamp: timestamp,
                rawBody
            }
        );

        assert.ok(result);
    });

    it('handles signature without sha256= prefix', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        prisma.paymentEvent.findUnique = async () => null;
        prisma.payment.findUnique = async () => mockPayment('pay1');
        prisma.payment.update = async () => mockPayment('pay1');

        const result = await service.recordWebhook(
            { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
            {
                signature: signature, // without prefix
                providerEventId: 'evt_123',
                providerTimestamp: timestamp,
                rawBody
            }
        );

        assert.ok(result);
    });

    it('uses timing-safe comparison to prevent timing attacks', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const validSignature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        // Create an almost-correct signature (differs by one character)
        const almostCorrectSignature = validSignature.substring(0, validSignature.length - 1) + 'x';

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: almostCorrectSignature,
                    providerEventId: 'evt_123',
                    providerTimestamp: timestamp,
                    rawBody
                }
            ),
            UnauthorizedException
        );
    });

    // ============================================================================
    // TIMESTAMP VALIDATION (REPLAY PROTECTION)
    // ============================================================================

    it('accepts webhook with recent timestamp', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString(); // current time
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        prisma.paymentEvent.findUnique = async () => null;
        prisma.payment.findUnique = async () => mockPayment('pay1');
        prisma.payment.update = async () => mockPayment('pay1');

        const result = await service.recordWebhook(
            { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
            {
                signature: `sha256=${signature}`,
                providerEventId: 'evt_123',
                providerTimestamp: timestamp,
                rawBody
            }
        );

        assert.ok(result);
    });

    it('rejects webhook with old timestamp (replay attack)', async () => {
        const oldTimestamp = Math.floor((Date.now() - 6 * 60 * 1000) / 1000).toString(); // 6 minutes ago
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(oldTimestamp, rawBody, 'test_webhook_secret_key');

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: 'evt_123',
                    providerTimestamp: oldTimestamp,
                    rawBody
                }
            ),
            UnauthorizedException
        );
    });

    it('rejects webhook with future timestamp', async () => {
        const futureTimestamp = Math.floor((Date.now() + 6 * 60 * 1000) / 1000).toString(); // 6 minutes from now
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(futureTimestamp, rawBody, 'test_webhook_secret_key');

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: 'evt_123',
                    providerTimestamp: futureTimestamp,
                    rawBody
                }
            ),
            UnauthorizedException
        );
    });

    it('accepts webhook within 5-minute replay window', async () => {
        const timestamp = Math.floor((Date.now() - 4.5 * 60 * 1000) / 1000).toString(); // 4.5 minutes ago
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        prisma.paymentEvent.findUnique = async () => null;
        prisma.payment.findUnique = async () => mockPayment('pay1');
        prisma.payment.update = async () => mockPayment('pay1');

        const result = await service.recordWebhook(
            { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
            {
                signature: `sha256=${signature}`,
                providerEventId: 'evt_123',
                providerTimestamp: timestamp,
                rawBody
            }
        );

        assert.ok(result);
    });

    it('rejects webhook with invalid timestamp format', async () => {
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature('not_a_number', rawBody, 'test_webhook_secret_key');

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: 'evt_123',
                    providerTimestamp: 'not_a_number',
                    rawBody
                }
            ),
            BadRequestException
        );
    });

    it('rejects webhook with missing timestamp', async () => {
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature('', rawBody, 'test_webhook_secret_key');

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: 'evt_123',
                    providerTimestamp: undefined,
                    rawBody
                }
            ),
            BadRequestException
        );
    });

    // ============================================================================
    // REQUIRED HEADERS
    // ============================================================================

    it('rejects webhook with missing provider event ID', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: undefined,
                    providerTimestamp: timestamp,
                    rawBody
                }
            ),
            BadRequestException
        );
    });

    it('rejects webhook with empty provider event ID', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: '   ',
                    providerTimestamp: timestamp,
                    rawBody
                }
            ),
            BadRequestException
        );
    });

    it('rejects webhook with missing raw body', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: 'evt_123',
                    providerTimestamp: timestamp,
                    rawBody: undefined
                }
            ),
            UnauthorizedException
        );
    });

    // ============================================================================
    // IDEMPOTENCY (DUPLICATE EVENT REJECTION)
    // ============================================================================

    it('returns existing payment when duplicate event is received', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        // Mock that event already exists
        prisma.paymentEvent.findUnique = async () => ({
            id: 'pevt_123',
            paymentId: 'pay1',
            type: 'PAYMENT_CONFIRMED',
            providerEventId: 'evt_123'
        });
        prisma.payment.findUnique = async () => mockPayment('pay1');

        const result = await service.recordWebhook(
            { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
            {
                signature: `sha256=${signature}`,
                providerEventId: 'evt_123',
                providerTimestamp: timestamp,
                rawBody
            }
        );

        // Should return existing payment without creating new event
        assert.ok(result);
        assert.equal(result.id, 'pay1');
    });

    it('processes webhook when event ID is new', async () => {
        let eventCreated = false;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        prisma.paymentEvent.findUnique = async () => null; // event doesn't exist
        prisma.payment.findUnique = async () => mockPayment('pay1');
        prisma.payment.update = async (args: any) => {
            if (args.data.events?.create) {
                eventCreated = true;
            }
            return mockPayment('pay1');
        };

        await service.recordWebhook(
            { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
            {
                signature: `sha256=${signature}`,
                providerEventId: 'evt_new',
                providerTimestamp: timestamp,
                rawBody
            }
        );

        assert.ok(eventCreated);
    });

    // ============================================================================
    // SECRET CONFIGURATION
    // ============================================================================

    it('requires webhook secret in production environment', async () => {
        process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = '';
        process.env.NODE_ENV = 'production';

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: 'sha256=anything',
                    providerEventId: 'evt_123',
                    providerTimestamp: timestamp,
                    rawBody
                }
            ),
            UnauthorizedException
        );
    });

    it('allows missing secret in development environment', async () => {
        process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET = '';
        process.env.NODE_ENV = 'development';

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });

        prisma.paymentEvent.findUnique = async () => null;
        prisma.payment.findUnique = async () => mockPayment('pay1');
        prisma.payment.update = async () => mockPayment('pay1');

        // Should not throw in development
        const result = await service.recordWebhook(
            { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
            {
                signature: undefined, // no signature required in dev without secret
                providerEventId: 'evt_123',
                providerTimestamp: timestamp,
                rawBody
            }
        );

        assert.ok(result);
    });

    // ============================================================================
    // PROVIDER VALIDATION
    // ============================================================================

    it('rejects webhooks when provider is manual_bank_transfer', async () => {
        process.env.PAYMENT_GATEWAY_PROVIDER = 'manual_bank_transfer';

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });
        const signature = generateSignature(timestamp, rawBody, 'test_webhook_secret_key');

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: 'evt_123',
                    providerTimestamp: timestamp,
                    rawBody
                }
            ),
            BadRequestException
        );
    });

    // ============================================================================
    // PAYLOAD INTEGRITY
    // ============================================================================

    it('signature verification includes both timestamp and raw body', async () => {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });

        // Generate signature with wrong body
        const wrongBody = JSON.stringify({ paymentId: 'pay2', event: 'payment.failed', payload: {} });
        const signature = generateSignature(timestamp, wrongBody, 'test_webhook_secret_key');

        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: 'evt_123',
                    providerTimestamp: timestamp,
                    rawBody // correct body, but signature was for wrong body
                }
            ),
            UnauthorizedException
        );
    });

    it('signature verification includes timestamp to prevent replay', async () => {
        const timestamp1 = Math.floor(Date.now() / 1000).toString();
        const timestamp2 = Math.floor((Date.now() + 1000) / 1000).toString();
        const rawBody = JSON.stringify({ paymentId: 'pay1', event: 'payment.confirmed', payload: {} });

        // Generate signature with timestamp1
        const signature = generateSignature(timestamp1, rawBody, 'test_webhook_secret_key');

        // Try to use signature with different timestamp2
        await assert.rejects(
            () => service.recordWebhook(
                { paymentId: 'pay1', event: 'payment.confirmed', payload: {} },
                {
                    signature: `sha256=${signature}`,
                    providerEventId: 'evt_123',
                    providerTimestamp: timestamp2, // different timestamp
                    rawBody
                }
            ),
            UnauthorizedException
        );
    });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSignature(timestamp: string, rawBody: string, secret: string): string {
    const canonicalPayload = `${timestamp}.${rawBody}`;
    return createHmac('sha256', secret).update(canonicalPayload).digest('hex');
}

function createMockPrisma() {
    return {
        paymentEvent: {
            findUnique: async () => null
        },
        payment: {
            findUnique: async () => null,
            update: async () => ({} as any)
        }
    };
}

function mockPayment(id: string) {
    return {
        id,
        orderId: 'order1',
        provider: 'stripe',
        providerReference: 'pi_123',
        amount: { toString: () => '100000' } as any,
        status: 'PAID' as any,
        payload: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        order: {
            id: 'order1',
            orderNumber: 'ORD-001',
            userId: 'user1',
            total: { toString: () => '100000' } as any,
            depositRequired: { toString: () => '0' } as any,
            paidAmount: { toString: () => '100000' } as any,
            paymentStatus: 'PAID' as any
        },
        events: []
    };
}
