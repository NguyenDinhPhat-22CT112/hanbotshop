import { Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';
import { AuditController } from './audit.controller';

@Module({
  imports: [IdentityModule],
  controllers: [AuditController]
})
export class AuditModule {}
