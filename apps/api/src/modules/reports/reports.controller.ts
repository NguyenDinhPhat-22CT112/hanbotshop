import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../identity/decorators/roles.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@Roles(UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue report', description: 'Get high-level revenue and recent order metrics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Revenue report' })
  revenue() {
    return this.reportsService.revenue();
  }
}
