import { Module } from '@nestjs/common';
import { PrintRequestController } from './print-request.controller';
import { PrintRequestService } from './print-request.service';
@Module({controllers:[PrintRequestController],providers:[PrintRequestService]})
export class PrintRequestModule {}
