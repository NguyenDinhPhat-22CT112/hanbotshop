import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { validateEnv } from './common/utils/validate-env';
import { AuditModule } from './modules/audit.module';
import { CartModule } from './modules/cart/cart.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { FileModule } from './modules/file/file.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProductionModule } from './modules/production/production.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrintRequestModule } from './modules/print-request/print-request.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per IP
    }]),
    CommonModule,
    PrismaModule,
    NotificationsModule,
    AuditModule,
    HealthModule,
    IdentityModule,
    CatalogModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    FileModule,
    PaymentModule,
    ProductionModule,
    ReportsModule,
    UsersModule,
    PrintRequestModule
  ]
})
export class AppModule {}
