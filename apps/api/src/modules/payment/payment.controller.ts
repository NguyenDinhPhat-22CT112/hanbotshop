import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/authenticated-user';
import { UserRole } from '@prisma/client';
import { checkoutSessionSchema, manualReceiptSchema, paymentWebhookSchema } from './dto/payment.dto';
import { PaymentService } from './payment.service';

type RawBodyRequest = {
  rawBody?: Buffer | string;
};

@ApiTags('Payment')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly idempotencyService: IdempotencyService
  ) { }

  @Post('checkout-session')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID used to safely retry payment session creation' })
  @ApiOperation({
    summary: 'Create checkout session',
    description: 'Create or reuse manual bank-transfer instructions for an eligible order'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orderId'],
      properties: {
        orderId: {
          type: 'string',
          example: 'cm123abc456',
          description: 'Order ID to create payment for'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created',
    schema: {
      type: 'object',
      properties: {
        payment: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cm789xyz123' },
            orderId: { type: 'string', example: 'cm123abc456' },
            provider: { type: 'string', example: 'manual_bank_transfer' },
            amount: { type: 'string', example: '1500000.00' },
            status: { type: 'string', enum: ['UNPAID', 'PAID'], example: 'UNPAID' }
          }
        },
        checkoutUrl: {
          type: 'string',
          example: '/checkout/bank-transfer?paymentId=cm789xyz123'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Order is already paid or is not in a payable state' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot pay for other user orders' })
  createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    const dto = parseZodSchema(checkoutSessionSchema, body);

    return this.idempotencyService.run({
      key: idempotencyKey,
      method: 'POST',
      path: '/payments/checkout-session',
      actorId: user.id,
      requestBody: dto,
      responseStatus: 201,
      handler: () => this.paymentService.createCheckoutSession(user, dto)
    });
  }

  @Post('manual-receipt')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Record COD receipt',
    description: 'Record money collected while an Order purchase is shipping'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orderId', 'amount'],
      properties: {
        orderId: { type: 'string' },
        amount: { type: 'number', example: 2000000 },
        note: { type: 'string', example: 'Shipper collected the remaining balance.' }
      }
    }
  })
  recordManualReceipt(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = parseZodSchema(manualReceiptSchema, body);

    return this.paymentService.recordManualReceipt(user, dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment', description: 'Get payment details by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment details with events',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        orderId: { type: 'string' },
        provider: { type: 'string', example: 'placeholder' },
        providerReference: { type: 'string', example: 'checkout_1234567890' },
        amount: { type: 'string', example: '1500000.00' },
        status: { type: 'string', enum: ['UNPAID', 'PAID'] },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['CHECKOUT_CREATED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED'] },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access other user payments' })
  getPayment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paymentService.getPayment(user, id);
  }

  @Post(':id/confirm-manual')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Confirm manual bank transfer', description: 'Mark a manual transfer and its order as paid (Admin only)' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 201, description: 'Manual transfer confirmed' })
  @ApiResponse({ status: 400, description: 'Payment is not a pending manual bank transfer' })
  confirmManualTransfer(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paymentService.confirmManualTransfer(user, id);
  }

  @Post('webhook')
  @ApiOperation({
    summary: 'Payment webhook',
    description: 'Receive payment webhook from payment gateway (requires signature verification)'
  })
  @ApiHeader({
    name: 'X-Provider-Signature',
    description: 'Provider HMAC-SHA256 signature of the webhook payload',
    required: true,
    schema: { type: 'string', example: 'sha256=abc123...' }
  })
  @ApiHeader({ name: 'X-Provider-Event-Id', required: true, description: 'Provider event ID used for dedupe' })
  @ApiHeader({ name: 'X-Provider-Timestamp', required: true, description: 'Provider event timestamp as Unix seconds' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentId', 'event', 'payload'],
      properties: {
        paymentId: { type: 'string', example: 'cm789xyz123' },
        event: {
          type: 'string',
          enum: ['payment.confirmed', 'payment.failed'],
          example: 'payment.confirmed'
        },
        payload: {
          type: 'object',
          description: 'Provider-specific webhook payload',
          example: {
            transactionId: 'txn_abc123',
            amount: 1500000,
            currency: 'VND',
            status: 'success'
          }
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  recordWebhook(
    @Body() body: unknown,
    @Req() request: RawBodyRequest,
    @Headers('x-provider-signature') signature?: string,
    @Headers('x-provider-event-id') providerEventId?: string,
    @Headers('x-provider-timestamp') providerTimestamp?: string
  ) {
    const dto = parseZodSchema(paymentWebhookSchema, body);

    return this.paymentService.recordWebhook(dto, {
      signature,
      providerEventId,
      providerTimestamp,
      rawBody: this.rawBodyToString(request.rawBody)
    });
  }

  private rawBodyToString(rawBody: Buffer | string | undefined) {
    if (Buffer.isBuffer(rawBody)) {
      return rawBody.toString('utf8');
    }

    return rawBody;
  }
}
