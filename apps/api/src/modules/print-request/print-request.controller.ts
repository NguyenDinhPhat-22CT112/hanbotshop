import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/authenticated-user';
import { createPrintRequestSchema } from './dto/print-request.dto';
import { PrintRequestService } from './print-request.service';

@Controller('print-requests')
export class PrintRequestController {
 constructor(private readonly service:PrintRequestService){}
 @Post() @UseGuards(AuthGuard)
 create(@CurrentUser() user:AuthenticatedUser,@Body() body:unknown){return this.service.create(user.id,parseZodSchema(createPrintRequestSchema,body))}
 @Get() @Roles(UserRole.ADMIN) @UseGuards(AuthGuard,RolesGuard)
 list(){return this.service.listForAdmin()}
}
