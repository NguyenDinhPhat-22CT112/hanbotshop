import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderNoteType, UserRole } from '@prisma/client';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/authenticated-user';
import {
  orderListQuerySchema,
  orderNoteSchema,
  trackingSchema,
  updateOrderPaymentSchema,
  updateOrderStatusSchema
} from './dto/orders.dto';
import { OrdersService } from './orders.service';
import { OrderTimelineService } from './services/order-timeline.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderTimelineService: OrderTimelineService
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List orders', description: 'Get paginated order list (customers see own orders, admins see all)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING_CONFIRMATION', 'CONFIRMED', 'WAITING_PAYMENT', 'PAID', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED'] })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  listOrders(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, unknown>) {
    const dto = parseZodSchema(orderListQuerySchema, query);

    return this.ordersService.listOrders(user, dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get order', description: 'Get order details by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details with items and payments' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access other user orders' })
  getOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.getOrder(user, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update order status', description: 'Update order status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['PENDING_CONFIRMATION', 'CONFIRMED', 'WAITING_PAYMENT', 'PAID', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'BLOCKED'],
          example: 'CONFIRMED'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  updateOrderStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateOrderStatusSchema, body);

    return this.ordersService.updateOrderStatus(user, id, dto);
  }

  @Patch(':id/payment')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update order payment status', description: 'Update order payment status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentStatus'],
      properties: {
        paymentStatus: {
          type: 'string',
          enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'],
          example: 'PAID'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Payment status updated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  updateOrderPayment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateOrderPaymentSchema, body);

    return this.ordersService.updateOrderPayment(user, id, dto);
  }

  @Patch(':id/tracking')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update tracking', description: 'Update order tracking information (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['trackingNumber', 'trackingCarrier'],
      properties: {
        trackingNumber: { type: 'string', example: 'VN123456789' },
        trackingCarrier: { type: 'string', example: 'Viettel Post' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Tracking information updated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  updateTracking(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(trackingSchema, body);

    return this.ordersService.updateTracking(user, id, dto);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Customers can cancel only before admin confirmation. Admins can cancel unpaid, non-terminal orders.'
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Order is confirmed, paid, shipped, or otherwise not cancellable' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  cancelOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.cancelOrder(user, id);
  }

  @Get(':id/notes')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List order notes', description: 'List manual order notes (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order notes list' })
  listNotes(@Param('id') id: string) {
    return this.ordersService.listNotes(id);
  }

  @Post(':id/notes')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add order note', description: 'Add manual order note (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['body'],
      properties: {
        type: { type: 'string', enum: ['GENERAL', 'PAYMENT', 'CONTACT'], example: 'GENERAL' },
        body: { type: 'string', example: 'Customer confirmed payment via chat.' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Order note created' })
  addNote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(orderNoteSchema, body);

    return this.ordersService.addNote(user, id, dto);
  }

  @Get(':id/payment-notes')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List payment notes', description: 'List manual payment notes for the order (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Payment notes list' })
  listPaymentNotes(@Param('id') id: string) {
    return this.ordersService.listNotes(id, OrderNoteType.PAYMENT);
  }

  @Post(':id/payment-notes')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add payment note', description: 'Add manual payment note for chat-based transactions (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: { type: 'string', example: 'Customer transferred 500000 VND and sent proof in chat.' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Payment note created' })
  addPaymentNote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(orderNoteSchema, { ...(body as Record<string, unknown>), type: OrderNoteType.PAYMENT });

    return this.ordersService.addNote(user, id, dto);
  }

  @Get(':id/timeline')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get order timeline', description: 'Get order event timeline with payment events' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order timeline events' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderTimeline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.orderTimelineService.getOrderTimeline(user, id);
  }
}
