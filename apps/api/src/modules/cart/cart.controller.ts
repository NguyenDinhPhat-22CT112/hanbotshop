import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import type { AuthenticatedUser } from '../identity/types/authenticated-user';
import { CartService } from './cart.service';
import { addCartItemSchema, mergeGuestCartSchema, updateCartItemSchema } from './dto/cart.dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get cart', description: 'Get current user shopping cart' })
  @ApiResponse({ status: 200, description: 'Cart with items and calculated totals' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add to cart', description: 'Add product to shopping cart' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['productId', 'quantity'],
      properties: {
        productId: { type: 'string', example: 'cm123abc456' },
        variantId: { type: 'string', nullable: true, example: 'cm789xyz123' },
        quantity: { type: 'number', minimum: 1, example: 1 }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @ApiResponse({ status: 404, description: 'Product or variant not found' })
  addCartItem(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = parseZodSchema(addCartItemSchema, body);

    return this.cartService.addCartItem(user.id, dto);
  }

  @Post('merge')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Merge guest cart', description: 'Add valid guest cart items that are not already in the user cart' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          maxItems: 30,
          items: {
            type: 'object',
            required: ['productId', 'quantity'],
            properties: {
              productId: { type: 'string' },
              variantId: { type: 'string', nullable: true },
              quantity: { type: 'number', minimum: 1, maximum: 99 }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Guest cart merged into the current user cart' })
  mergeGuestCart(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = parseZodSchema(mergeGuestCartSchema, body);

    return this.cartService.mergeGuestCart(user.id, dto);
  }

  @Patch('items/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update cart item', description: 'Update quantity of cart item' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['quantity'],
      properties: {
        quantity: { type: 'number', minimum: 1, example: 2 }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  updateCartItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateCartItemSchema, body);

    return this.cartService.updateCartItem(user.id, id, dto);
  }

  @Delete('items/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove from cart', description: 'Remove item from shopping cart' })
  @ApiParam({ name: 'id', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  removeCartItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cartService.removeCartItem(user.id, id);
  }
}
