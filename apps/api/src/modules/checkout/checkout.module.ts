import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { IdentityModule } from '../identity/identity.module';
import { OrdersModule } from '../orders/orders.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [IdentityModule, CartModule, OrdersModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService]
})
export class CheckoutModule {}
