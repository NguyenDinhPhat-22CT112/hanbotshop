import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Check API health status (no authentication required)'
  })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok', description: 'Health status' },
        service: { type: 'string', example: 'hanbotorder-api', description: 'Service name' }
      }
    }
  })
  getHealth() {
    return {
      status: 'ok',
      service: 'hanbotorder-api',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    };
  }

  @Get('live')
  getLiveness() {
    return { status: 'ok', service: 'hanbotorder-api', uptimeSeconds: Math.round(process.uptime()) };
  }

  @Get('ready')
  async getReadiness() {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        service: 'hanbotorder-api',
        checks: { database: { status: 'up', latencyMs: Date.now() - startedAt } },
        timestamp: new Date().toISOString()
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'hanbotorder-api',
        checks: { database: { status: 'down' } },
        timestamp: new Date().toISOString()
      });
    }
  }
}
