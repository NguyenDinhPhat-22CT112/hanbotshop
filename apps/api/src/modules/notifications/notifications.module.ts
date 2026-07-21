import { Global, Module } from '@nestjs/common';
import { EmailOutboxService } from './email-outbox.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { IdentityModule } from '../identity/identity.module';

@Global()
@Module({
  imports: [IdentityModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailOutboxService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
