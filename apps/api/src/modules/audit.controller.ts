import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditAction, UserRole } from '@prisma/client';
import { AuditService } from '../common/audit.service';
import { parseZodSchema } from '../common/utils/parse-zod-schema';
import { Roles } from './identity/decorators/roles.decorator';
import { AuthGuard } from './identity/guards/auth.guard';
import { RolesGuard } from './identity/guards/roles.guard';
import { auditListQuerySchema } from './audit.dto';

@ApiTags('Audit')
@Controller('audit-logs')
@Roles(UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs', description: 'List append-only audit logs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 24 })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'resourceType', required: false, type: String, example: 'Order' })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  list(@Query() query: Record<string, unknown>) {
    const dto = parseZodSchema(auditListQuerySchema, query);

    return this.auditService.list(dto);
  }
}
