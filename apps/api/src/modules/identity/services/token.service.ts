import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { UserRole } from '@prisma/client';

type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
};

type PasswordResetPayload = {
  sub: string;
  email: string;
  purpose: 'password_reset';
  passwordHashDigest: string;
  exp: number;
};

const encoder = new TextEncoder();

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {}

  signAccessToken(payload: Omit<TokenPayload, 'exp'>) {
    const expiresInSeconds = Number(this.configService.get<string>('JWT_EXPIRES_IN_SECONDS') ?? 60 * 60 * 24 * 7);
    const tokenPayload: TokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds
    };

    return this.sign(tokenPayload);
  }

  signPasswordResetToken(payload: { sub: string; email: string; passwordHash: string }) {
    const expiresInSeconds = Number(this.configService.get<string>('PASSWORD_RESET_EXPIRES_IN_SECONDS') ?? 60 * 30);
    const tokenPayload: PasswordResetPayload = {
      sub: payload.sub,
      email: payload.email,
      purpose: 'password_reset',
      passwordHashDigest: this.passwordHashDigest(payload.passwordHash),
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds
    };

    return this.sign(tokenPayload);
  }

  verifyAccessToken(token: string): TokenPayload {
    const payload = this.verifySignedPayload<TokenPayload>(token, 'access token');

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Access token expired.');
    }

    return payload;
  }

  verifyPasswordResetToken(token: string): PasswordResetPayload {
    const payload = this.verifySignedPayload<PasswordResetPayload>(token, 'password reset token');

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Password reset token expired.');
    }

    if (payload.purpose !== 'password_reset') {
      throw new UnauthorizedException('Invalid password reset token.');
    }

    return payload;
  }

  isPasswordResetTokenCurrent(payload: PasswordResetPayload, passwordHash: string) {
    return this.safeCompare(payload.passwordHashDigest, this.passwordHashDigest(passwordHash));
  }

  passwordHashDigest(passwordHash: string) {
    return createHmac('sha256', this.getSecret()).update(passwordHash).digest('base64url');
  }

  private verifySignedPayload<T>(token: string, label: string): T & { exp: number } {
    try {
      return this.jwtService.verify<T & { exp: number }>(token);
    } catch {
      throw new UnauthorizedException(`Invalid ${label}.`);
    }
  }

  private sign(payload: TokenPayload | PasswordResetPayload) {
    return this.jwtService.sign(payload);
  }

  private safeCompare(left: string, right: string) {
    const leftBuffer = encoder.encode(left);
    const rightBuffer = encoder.encode(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private getSecret() {
    const secret = this.configService.get<string>('JWT_SECRET')?.trim();

    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET environment variable is not configured.');
    }

    if (secret === 'change-me') {
      throw new InternalServerErrorException('JWT_SECRET must be changed from the default value.');
    }

    return secret;
  }
}
