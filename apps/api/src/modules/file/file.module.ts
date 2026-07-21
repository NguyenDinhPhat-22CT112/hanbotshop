import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Module({
  imports: [IdentityModule],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService]
})
export class FileModule {}
