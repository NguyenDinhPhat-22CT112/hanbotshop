import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Roles } from '../identity/decorators/roles.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedUser } from '../identity/types/authenticated-user';
import {
  addressSchema,
  createUserSchema,
  updateAddressSchema,
  updateProfileSchema,
  updateUserPasswordSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userListQuerySchema
} from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my profile', description: 'Get current user profile information' })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string', format: 'email' },
        name: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
        role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] },
        status: { type: 'string', enum: ['ACTIVE', 'DISABLED'] },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update my profile', description: 'Update current user profile (name, phone)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Nguyễn Văn A' },
        phone: { type: 'string', example: '0901234567' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = parseZodSchema(updateProfileSchema, body);

    return this.usersService.updateMe(user.id, dto);
  }

  @Get('me/addresses')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List my addresses', description: 'Get list of current user saved addresses' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listMyAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listAddresses(user.id);
  }

  @Post('me/addresses')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add address', description: 'Add a new address to current user profile' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['recipient', 'phone', 'line1', 'city'],
      properties: {
        recipient: { type: 'string', example: 'Nguyễn Văn A' },
        phone: { type: 'string', example: '0901234567' },
        line1: { type: 'string', example: '123 Lê Lợi' },
        line2: { type: 'string', nullable: true, example: 'Phường Bến Thành' },
        city: { type: 'string', example: 'TP. Hồ Chí Minh' },
        province: { type: 'string', nullable: true, example: 'Hồ Chí Minh' },
        postalCode: { type: 'string', nullable: true, example: '700000' },
        countryCode: { type: 'string', example: 'VN', description: 'ISO 3166-1 alpha-2 country code' },
        isDefault: { type: 'boolean', example: false, description: 'Set as default address' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createMyAddress(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const dto = parseZodSchema(addressSchema, body);

    return this.usersService.createAddress(user.id, dto);
  }

  @Patch('me/addresses/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update address', description: 'Update saved address details' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  updateMyAddress(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateAddressSchema, body);

    return this.usersService.updateAddress(user.id, id, dto);
  }

  @Patch('me/addresses/:id/default')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Set default address', description: 'Set a saved address as the current user default address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Default address updated successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  setDefaultAddress(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.setDefaultAddress(user.id, id);
  }

  @Delete('me/addresses/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete address', description: 'Delete a saved address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  deleteMyAddress(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List users', description: 'Get paginated list of all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'role', required: false, enum: ['CUSTOMER', 'ADMIN'], description: 'Filter by user role' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'DISABLED'], description: 'Filter by user status' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search by name or email' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  listUsers(@Query() query: Record<string, unknown>) {
    const dto = parseZodSchema(userListQuerySchema, query);

    return this.usersService.listUsers(dto);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create user', description: 'Create a customer or administrator account (Admin only)' })
  createUser(@CurrentUser() actor: AuthenticatedUser, @Body() body: unknown) {
    return this.usersService.createUser(actor.id, parseZodSchema(createUserSchema, body));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user', description: 'Permanently delete a user without order history (Admin only)' })
  deleteUser(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.deleteUser(actor.id, id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user', description: 'Get user details by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user status', description: 'Enable or disable user account (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['ACTIVE', 'DISABLED'],
          example: 'DISABLED',
          description: 'New user status'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot disable yourself' })
  updateStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateUserStatusSchema, body);

    return this.usersService.updateStatus(user.id, id, dto);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user role', description: 'Change user role between CUSTOMER and ADMIN (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: {
          type: 'string',
          enum: ['CUSTOMER', 'ADMIN'],
          example: 'ADMIN',
          description: 'New user role'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'User role updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot change your own role' })
  updateRole(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateUserRoleSchema, body);

    return this.usersService.updateRole(user.id, id, dto);
  }

  @Patch(':id/password')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Set a new password for a user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['password'],
      properties: {
        password: { type: 'string', minLength: 8, example: 'SecurePassword123!' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'User password updated' })
  @ApiResponse({ status: 403, description: 'Cannot change your own password here' })
  updatePassword(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateUserPasswordSchema, body);

    return this.usersService.updatePassword(user.id, id, dto);
  }

  @Get(':id/orders')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user orders', description: 'Get list of orders for a specific user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of user orders' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserOrders(@Param('id') id: string) {
    return this.usersService.getUserOrders(id);
  }
}
