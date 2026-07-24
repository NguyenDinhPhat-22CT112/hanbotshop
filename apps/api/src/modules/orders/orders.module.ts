import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderTimelineService } from './services/order-timeline.service';

@Module({
  imports: [IdentityModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderTimelineService],
  exports: [OrdersService, OrderTimelineService]
})
export class OrdersModule {}
