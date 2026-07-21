import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [IdentityModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService]
})
export class CartModule {}
