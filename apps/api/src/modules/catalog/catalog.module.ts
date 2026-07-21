import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [IdentityModule],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService]
})
export class CatalogModule {}
