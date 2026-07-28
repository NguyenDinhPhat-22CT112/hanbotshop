import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/authenticated-user';
import { UserRole } from '@prisma/client';
import { createFileSchema } from './dto/file.dto';
import { FileService } from './file.service';

@ApiTags('Files')
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) { }

  @Post('upload-intent')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create upload intent',
    description: 'Create file upload intent with presigned URL for direct browser upload to cloud storage'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['filename', 'contentType', 'size'],
      properties: {
        filename: {
          type: 'string',
          example: 'gundam-rx-78-2.jpg',
          description: 'Original filename'
        },
        contentType: {
          type: 'string',
          example: 'image/jpeg',
          description: 'MIME type'
        },
        size: {
          type: 'number',
          example: 2048576,
          description: 'File size in bytes'
        },
        purpose: {
          type: 'string',
          enum: ['product-image', 'avatar', 'document'],
          example: 'product-image',
          description: 'File upload purpose'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Upload intent created with presigned URL',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cm123abc456' },
            filename: { type: 'string', example: 'gundam-rx-78-2.jpg' },
            contentType: { type: 'string', example: 'image/jpeg' },
            size: { type: 'number', example: 2048576 },
            url: { type: 'string', format: 'uri', example: 'https://cdn.example.com/uploads/gundam-rx-78-2.jpg' }
          }
        },
        uploadUrl: {
          type: 'string',
          format: 'uri',
          example: 'https://s3.amazonaws.com/bucket/key?signature=...',
          description: 'Presigned URL for direct upload (valid for 15 minutes)'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid file metadata or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createUploadIntent(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = parseZodSchema(createFileSchema, body);

    return this.fileService.createUploadIntent(user, dto);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create upload intent (legacy)',
    description: 'Legacy alias for POST /files/upload-intent'
  })
  createUploadIntentLegacy(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.createUploadIntent(user, body);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List files', description: 'List recent uploaded files (Admin only)' })
  @ApiResponse({ status: 200, description: 'Recent file list' })
  listFiles(@CurrentUser() user: AuthenticatedUser) {
    return this.fileService.listFiles(user);
  }

  @Get('public')
  async publicFile(@Query('key') key: string, @Res() response: { setHeader(name: string, value: string): void; send(body: Buffer): void }) {
    const file = await this.fileService.getPublicObject(key);
    response.setHeader('content-type', file.mimeType);
    response.setHeader('cache-control', 'public, max-age=31536000, immutable');
    response.send(file.bytes);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get file', description: 'Get file metadata by ID (owner or admin only)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File metadata',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string', description: 'Owner user ID' },
        filename: { type: 'string' },
        contentType: { type: 'string' },
        size: { type: 'number', description: 'File size in bytes' },
        url: { type: 'string', format: 'uri', description: 'Public CDN URL' },
        storageKey: { type: 'string', description: 'S3 object key' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access other user files' })
  getFile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fileService.getFile(user, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete file',
    description: 'Delete an unused file from cloud storage and remove its database record (Admin only)'
  })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted from cloud storage and database' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 409, description: 'File is still used by a product or print request' })
  deleteFile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fileService.deleteFile(user, id);
  }

  @Patch(':id/confirm')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Confirm upload', description: 'Confirm direct upload to object storage has completed' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Upload confirmed' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot confirm other user files' })
  confirmUpload(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fileService.confirmUpload(user, id);
  }
}
