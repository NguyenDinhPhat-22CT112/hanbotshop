import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import type { AuthenticatedUser } from '../identity/types/authenticated-user';
import { CheckoutService } from './checkout.service';
import { checkoutSchema } from './dto/checkout.dto';

@ApiTags('Checkout')
@Controller()
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly idempotencyService: IdempotencyService
  ) {}

  @Post('checkout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID used to safely retry checkout creation' })
  @ApiOperation({ summary: 'Checkout', description: 'Create order from cart items' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['recipientName', 'recipientPhone', 'shippingAddress'],
      properties: {
        recipientName: { type: 'string', example: 'Nguyen Van A' },
        recipientPhone: { type: 'string', example: '0901234567' },
        shippingAddress: {
          type: 'object',
          properties: {
            line1: { type: 'string', example: '123 Le Loi' },
            line2: { type: 'string', nullable: true },
            city: { type: 'string', example: 'TP. Ho Chi Minh' },
            province: { type: 'string', example: 'Ho Chi Minh' },
            postalCode: { type: 'string', example: '700000' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty or validation error' })
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    const dto = parseZodSchema(checkoutSchema, body);

    return this.idempotencyService.run({
      key: idempotencyKey,
      method: 'POST',
      path: '/checkout',
      actorId: user.id,
      requestBody: dto,
      responseStatus: 201,
      handler: () => this.checkoutService.checkout(user.id, dto)
    });
  }

  @Post('cart/checkout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID used to safely retry checkout creation' })
  @ApiOperation({ summary: 'Checkout (legacy)', description: 'Legacy alias for POST /checkout' })
  checkoutLegacy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    const dto = parseZodSchema(checkoutSchema, body);

    return this.idempotencyService.run({
      key: idempotencyKey,
      method: 'POST',
      path: '/cart/checkout',
      actorId: user.id,
      requestBody: dto,
      responseStatus: 201,
      handler: () => this.checkoutService.checkout(user.id, dto)
    });
  }
}
