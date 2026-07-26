import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, UserRole, UserStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../../../common/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from '../dto/auth.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) {}

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ConflictException('Email is already registered.');
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name,
        phone: dto.phone
      },
      select: this.userSelect()
    });

    return this.authResponse(user);
  }

  async login(dto: LoginDto, ipAddress = 'unknown') {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.auditLoginFailed(email, ipAddress, 'invalid_credentials_or_inactive_user');
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.passwordService.verifyPassword(dto.password, user.passwordHash);

    if (!passwordMatches) {
      await this.auditLoginFailed(email, ipAddress, 'invalid_credentials');
      throw new UnauthorizedException('Invalid email or password.');
    }

    await this.auditService.record({
      actorId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      resourceType: 'Auth',
      resourceId: user.id,
      metadata: { email: user.email, ipAddress }
    });

    return this.authResponse(user);
  }

  async forgotPassword(dto: ForgotPasswordDto, ipAddress = 'unknown') {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const baseResponse = {
      success: true,
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.'
    };

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.auditService.record({
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        resourceType: 'Auth',
        resourceId: email,
        metadata: { email, ipAddress, accepted: true, matchedUser: false }
      });

      return baseResponse;
    }

    await this.auditService.record({
      actorId: user.id,
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      resourceType: 'Auth',
      resourceId: user.id,
      metadata: { email: user.email, ipAddress, accepted: true, matchedUser: true }
    });

    const token = this.tokenService.signPasswordResetToken({
      sub: user.id,
      email: user.email,
      passwordHash: user.passwordHash
    });
    const resetUrl = this.buildPasswordResetUrl(token);

    return {
      ...baseResponse,
      resetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl
    };
  }

  async resetPassword(dto: ResetPasswordDto, ipAddress = 'unknown') {
    const payload = this.tokenService.verifyPasswordResetToken(dto.token);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.status !== UserStatus.ACTIVE || user.email !== payload.email) {
      throw new UnauthorizedException('Invalid password reset token.');
    }

    if (!this.tokenService.isPasswordResetTokenCurrent(payload, user.passwordHash)) {
      throw new UnauthorizedException('Password reset token has already been used.');
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
      select: this.userSelect()
    });

    await this.auditService.record({
      actorId: user.id,
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      resourceType: 'Auth',
      resourceId: user.id,
      metadata: { email: user.email, ipAddress }
    });

    return this.authResponse(updatedUser);
  }

  async findCurrentUser(userId: string, sessionId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...this.userSelect(),
        adminSessionId: true,
        adminSessionLastActiveAt: true,
        adminPreviousSessionId: true,
        adminPreviousSessionUntil: true
      }
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active.');
    }

    if (user.role === 'ADMIN') {
      const idleTimeoutSeconds = this.readPositiveInt(
        this.configService.get<string>('ADMIN_IDLE_TIMEOUT_SECONDS'),
        60 * 30
      );
      const idleDeadline = Date.now() - idleTimeoutSeconds * 1000;
      const isCurrentSession = Boolean(sessionId && user.adminSessionId === sessionId);
      const isPreviousSessionInGrace = Boolean(
        sessionId &&
        user.adminPreviousSessionId === sessionId &&
        user.adminPreviousSessionUntil &&
        user.adminPreviousSessionUntil.getTime() >= Date.now()
      );

      if (
        !sessionId ||
        (!isCurrentSession && !isPreviousSessionInGrace) ||
        (isCurrentSession &&
          (!user.adminSessionLastActiveAt || user.adminSessionLastActiveAt.getTime() < idleDeadline))
      ) {
        throw new UnauthorizedException('Admin session expired or was replaced by a newer login.');
      }

      // The outgoing device may finish its work during the handoff window, but
      // it must not extend either its own grace period or the new session's idle timer.
      if (isPreviousSessionInGrace) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status
        };
      }

      const refreshed = await this.prisma.user.updateMany({
        where: {
          id: user.id,
          adminSessionId: sessionId
        },
        data: {
          adminSessionLastActiveAt: new Date()
        }
      });

      if (refreshed.count !== 1) {
        throw new UnauthorizedException('Admin session was replaced by a newer login.');
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status
    };
  }

  async logout(userId: string, role: string, sessionId?: string) {
    if (role === 'ADMIN' && sessionId) {
      const currentSession = await this.prisma.user.updateMany({
        where: { id: userId, adminSessionId: sessionId },
        data: {
          adminSessionId: null,
          adminSessionLastActiveAt: null,
          adminPreviousSessionId: null,
          adminPreviousSessionUntil: null
        }
      });

      if (currentSession.count === 0) {
        await this.prisma.user.updateMany({
          where: { id: userId, adminPreviousSessionId: sessionId },
          data: {
            adminPreviousSessionId: null,
            adminPreviousSessionUntil: null
          }
        });
      }
    }

    return { success: true };
  }

  private async authResponse(user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    adminSessionId?: string | null;
    adminSessionLastActiveAt?: Date | null;
  }) {
    const sessionId = user.role === 'ADMIN' ? randomUUID() : undefined;

    if (sessionId) {
      const now = new Date();
      const idleTimeoutSeconds = this.readPositiveInt(
        this.configService.get<string>('ADMIN_IDLE_TIMEOUT_SECONDS'),
        60 * 30
      );
      const replacementGraceSeconds = this.readPositiveInt(
        this.configService.get<string>('ADMIN_SESSION_REPLACEMENT_GRACE_SECONDS'),
        10
      );
      const previousSessionIsActive = Boolean(
        user.adminSessionId &&
        user.adminSessionLastActiveAt &&
        user.adminSessionLastActiveAt.getTime() >= now.getTime() - idleTimeoutSeconds * 1000
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          adminSessionId: sessionId,
          adminSessionLastActiveAt: now,
          adminPreviousSessionId: previousSessionIsActive ? user.adminSessionId : null,
          adminPreviousSessionUntil: previousSessionIsActive
            ? new Date(now.getTime() + replacementGraceSeconds * 1000)
            : null
        }
      });
    }

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(sessionId ? { sessionId } : {})
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  private normalizeEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new BadRequestException('Email is required.');
    }

    return normalizedEmail;
  }

  private readPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private buildPasswordResetUrl(token: string) {
    const webUrl = this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
    const normalizedWebUrl = webUrl.replace(/\/$/, '');

    return `${normalizedWebUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private auditLoginFailed(email: string, ipAddress: string, reason: string) {
    return this.auditService.record({
      action: AuditAction.LOGIN_FAILED,
      resourceType: 'Auth',
      resourceId: email,
      metadata: { email, ipAddress, reason }
    });
  }

  private userSelect() {
    return {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true
    } as const;
  }
}
