import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { Roles } from '../identity/decorators/roles.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import {
  addInternalNoteSchema,
  addProductionEventSchema,
  createProductionJobSchema,
  productionJobListQuerySchema,
  updateProductionJobAssigneeSchema,
  updateProductionJobPrioritySchema,
  updateProductionJobStatusSchema
} from './dto/production.dto';
import { ProductionService } from './production.service';

@ApiTags('Production')
@Controller('production-jobs')
@Roles(UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) { }

  @Get()
  @ApiOperation({ summary: 'List production jobs', description: 'Get paginated list of production jobs with filters (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['QUEUED', 'PREPARING', 'PRINTING', 'POST_PROCESSING', 'PAINTING', 'QUALITY_CHECK', 'READY', 'BLOCKED', 'DONE'], description: 'Production status filter' })
  @ApiQuery({ name: 'orderId', required: false, type: String, description: 'Filter by order ID' })
  @ApiResponse({ status: 200, description: 'Paginated production job list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  list(@Query() query: Record<string, unknown>) {
    const dto = parseZodSchema(productionJobListQuerySchema, query);

    return this.productionService.list(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create production job', description: 'Create a new production job for an order (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orderId', 'title', 'status'],
      properties: {
        orderId: { type: 'string', example: 'cm123abc456', description: 'Order ID' },
        title: { type: 'string', example: 'HBO-20260630-ABC123 - RG Gundam, MG Zaku II', description: 'Job title' },
        status: {
          type: 'string',
          enum: ['QUEUED', 'PREPARING', 'PRINTING', 'POST_PROCESSING', 'PAINTING', 'QUALITY_CHECK', 'READY', 'BLOCKED', 'DONE'],
          example: 'QUEUED',
          description: 'Initial production status'
        },
        note: { type: 'string', nullable: true, example: 'Rush order - customer needs by next week', description: 'Optional note' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Production job created successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  create(@Body() body: unknown) {
    const dto = parseZodSchema(createProductionJobSchema, body);

    return this.productionService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get production job', description: 'Get production job details with events and notes (Admin only)' })
  @ApiParam({ name: 'id', description: 'Production job ID' })
  @ApiResponse({
    status: 200,
    description: 'Production job details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        orderId: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string', enum: ['QUEUED', 'PREPARING', 'PRINTING', 'POST_PROCESSING', 'PAINTING', 'QUALITY_CHECK', 'READY', 'BLOCKED', 'DONE'] },
        order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string', example: 'HBO-20260630-ABC123' },
            status: { type: 'string' },
            paymentStatus: { type: 'string' }
          }
        },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              note: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        internalNotes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              body: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Production job not found' })
  get(@Param('id') id: string) {
    return this.productionService.get(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get production timeline', description: 'Get read-only production job timeline (Admin only)' })
  @ApiParam({ name: 'id', description: 'Production job ID' })
  @ApiResponse({ status: 200, description: 'Production timeline events' })
  @ApiResponse({ status: 404, description: 'Production job not found' })
  getTimeline(@Param('id') id: string) {
    return this.productionService.getTimeline(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update production status', description: 'Update production job status and create status event (Admin only)' })
  @ApiParam({ name: 'id', description: 'Production job ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['QUEUED', 'PREPARING', 'PRINTING', 'POST_PROCESSING', 'PAINTING', 'QUALITY_CHECK', 'READY', 'BLOCKED', 'DONE'],
          example: 'PRINTING'
        },
        note: { type: 'string', nullable: true, example: 'Started 3D printing - estimated 8 hours' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Production job not found' })
  updateStatus(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateProductionJobStatusSchema, body);

    return this.productionService.updateStatus(id, dto);
  }

  @Patch(':id/assignee')
  @ApiOperation({ summary: 'Update production assignee', description: 'Assign or unassign a production job (Admin only)' })
  @ApiParam({ name: 'id', description: 'Production job ID' })
  @ApiResponse({ status: 200, description: 'Assignee updated successfully' })
  @ApiResponse({ status: 404, description: 'Production job not found' })
  updateAssignee(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateProductionJobAssigneeSchema, body);

    return this.productionService.updateAssignee(id, dto);
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: 'Update production priority', description: 'Update production job priority (Admin only)' })
  @ApiParam({ name: 'id', description: 'Production job ID' })
  @ApiResponse({ status: 200, description: 'Priority updated successfully' })
  @ApiResponse({ status: 404, description: 'Production job not found' })
  updatePriority(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateProductionJobPrioritySchema, body);

    return this.productionService.updatePriority(id, dto);
  }

  @Post(':id/events')
  @ApiOperation({ summary: 'Add production event', description: 'Add a production event (status change with note) (Admin only)' })
  @ApiParam({ name: 'id', description: 'Production job ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['QUEUED', 'PREPARING', 'PRINTING', 'POST_PROCESSING', 'PAINTING', 'QUALITY_CHECK', 'READY', 'BLOCKED', 'DONE'],
          example: 'QUALITY_CHECK'
        },
        note: { type: 'string', nullable: true, example: 'Quality check completed - minor paint touch-up needed' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Event added successfully' })
  @ApiResponse({ status: 404, description: 'Production job not found' })
  addEvent(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(addProductionEventSchema, body);

    return this.productionService.addEvent(id, dto);
  }

  @Get(':id/internal-notes')
  @ApiOperation({ summary: 'List internal notes', description: 'List production internal notes (Admin only)' })
  @ApiParam({ name: 'id', description: 'Production job ID' })
  @ApiResponse({ status: 200, description: 'Internal notes list' })
  @ApiResponse({ status: 404, description: 'Production job not found' })
  listInternalNotes(@Param('id') id: string) {
    return this.productionService.listInternalNotes(id);
  }

  @Post(':id/internal-notes')
  @ApiOperation({ summary: 'Add internal note', description: 'Add internal production note (not visible to customers) (Admin only)' })
  @ApiParam({ name: 'id', description: 'Production job ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'string',
          example: 'Customer requested custom paint color - using Tamiya X-14 Sky Blue instead of standard blue',
          description: 'Note content'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Internal note added successfully' })
  @ApiResponse({ status: 404, description: 'Production job not found' })
  addInternalNote(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(addInternalNoteSchema, body);

    return this.productionService.addInternalNote(id, dto);
  }
}
