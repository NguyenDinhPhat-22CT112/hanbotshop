import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import type { AuthRequest } from '../types/authenticated-user';
import {
  adminSessionCookieName,
  sessionCookieName,
  sessionScopeHeaderName
} from '../session-cookie';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const { tokens, requiredRole } = this.extractTokens(request);
    let lastUnauthorizedError: UnauthorizedException | undefined;

    for (const token of tokens) {
      try {
        const payload = this.tokenService.verifyAccessToken(token);
        const user = await this.authService.findCurrentUser(payload.sub);

        if (requiredRole && user.role !== requiredRole) {
          throw new UnauthorizedException('Authentication session has the wrong account role.');
        }

        request.currentUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role
        };
        return true;
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) {
          throw error;
        }

        lastUnauthorizedError = error;
      }
    }

    throw lastUnauthorizedError ?? new UnauthorizedException('Invalid authentication session.');
  }

  private extractTokens(request: AuthRequest) {
    const authorization = request.headers.authorization;
    const headerValue = Array.isArray(authorization) ? authorization[0] : authorization;

    if (headerValue?.startsWith('Bearer ')) {
      return {
        tokens: [headerValue.slice('Bearer '.length).trim()],
        requiredRole: undefined
      };
    }

    const cookieHeader = request.headers.cookie;
    const serializedCookies = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    const scopeHeader = request.headers[sessionScopeHeaderName];
    const scope = Array.isArray(scopeHeader) ? scopeHeader[0] : scopeHeader;
    const cookieName = scope === 'admin' ? adminSessionCookieName : sessionCookieName;
    const tokens = this.readCookies(serializedCookies, cookieName);

    if (tokens.length === 0) {
      throw new UnauthorizedException('Missing authentication session.');
    }

    return {
      tokens,
      requiredRole: scope === 'admin' ? UserRole.ADMIN : UserRole.CUSTOMER
    };
  }

  private readCookies(cookieHeader: string | undefined, name: string) {
    if (!cookieHeader) {
      return [];
    }

    const values: string[] = [];

    for (const part of cookieHeader.split(';')) {
      const separator = part.indexOf('=');

      if (separator < 0 || part.slice(0, separator).trim() !== name) {
        continue;
      }

      const value = part.slice(separator + 1).trim();

      try {
        values.push(decodeURIComponent(value));
      } catch {
        // Ignore a malformed duplicate and continue looking for a valid session cookie.
      }
    }

    return [...new Set(values)];
  }
}
