import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { AuditService } from './audit.service';
import { IdempotencyService } from './idempotency/idempotency.service';
import { RateLimitGuard } from './rate-limit.guard';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AuditService,
    IdempotencyService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    }
  ],
  exports: [AuditService, IdempotencyService]
})
export class CommonModule {}
