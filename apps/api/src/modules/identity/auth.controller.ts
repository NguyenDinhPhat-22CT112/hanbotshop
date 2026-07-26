import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './dto/auth.dto';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './services/auth.service';
import { clearSessionCookies, setSessionCookies } from './session-cookie';
import type { AuthenticatedUser } from './types/authenticated-user';

type ClientRequest = {
  ip?: string;
  socket?: { remoteAddress?: string };
};

type CookieResponse = Parameters<typeof setSessionCookies>[0];

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Register new user', description: 'Create a new customer account' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', format: 'email', example: 'customer@example.com' },
        password: { type: 'string', minLength: 8, example: 'SecurePassword123!' },
        name: { type: 'string', example: 'Nguyễn Văn A' },
        phone: { type: 'string', example: '0901234567' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation error or email already exists' })
  async register(@Body() body: unknown, @Res({ passthrough: true }) response: CookieResponse) {
    const dto = parseZodSchema(registerSchema, body);
    const result = await this.authService.register(dto);

    return this.establishSession(response, result);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login', description: 'Authenticate user and establish a Secure HttpOnly cookie session' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'customer@example.com' },
        password: { type: 'string', example: 'SecurePassword123!' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    schema: {
      type: 'object',
      properties: {
        tokenType: { type: 'string', example: 'Cookie' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cm123abc456' },
            email: { type: 'string', example: 'customer@example.com' },
            name: { type: 'string', example: 'Nguyễn Văn A' },
            role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'], example: 'CUSTOMER' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() body: unknown,
    @Req() request: ClientRequest,
    @Res({ passthrough: true }) response: CookieResponse
  ) {
    const dto = parseZodSchema(loginSchema, body);
    const result = await this.authService.login(dto, this.clientIp(request));

    return this.establishSession(response, result);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset', description: 'Create a password reset token for the given email' })
  @ApiResponse({ status: 200, description: 'Password reset request accepted' })
  forgotPassword(@Body() body: unknown, @Req() request: ClientRequest) {
    const dto = parseZodSchema(forgotPasswordSchema, body);

    return this.authService.forgotPassword(dto, this.clientIp(request));
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password', description: 'Set a new password using a password reset token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired reset token' })
  async resetPassword(
    @Body() body: unknown,
    @Req() request: ClientRequest,
    @Res({ passthrough: true }) response: CookieResponse
  ) {
    const dto = parseZodSchema(resetPasswordSchema, body);
    const result = await this.authService.resetPassword(dto, this.clientIp(request));

    return this.establishSession(response, result);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout', description: 'Invalidate current session' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  logout(@Res({ passthrough: true }) response: CookieResponse) {
    clearSessionCookies(response);

    return this.authService.logout();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user', description: 'Retrieve authenticated user information' })
  @ApiResponse({
    status: 200,
    description: 'Current user data',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Get('admin-check')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin authorization check', description: 'Verify admin role access' })
  @ApiResponse({ status: 200, description: 'User has admin access' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  adminCheck(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  private clientIp(request: ClientRequest) {
    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }

  private establishSession(
    response: CookieResponse,
    result: Awaited<ReturnType<AuthService['login']>>
  ) {
    setSessionCookies(response, result.accessToken);

    return {
      tokenType: 'Cookie',
      user: result.user
    };
  }
}
