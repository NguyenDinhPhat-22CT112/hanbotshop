import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { skipRateLimitMetadataKey } from './rate-limit.decorator';

type RateLimitRequest = {
  ip?: string;
  method?: string;
  originalUrl?: string;
  url?: string;
  socket?: { remoteAddress?: string };
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly windowMs = this.readPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
  private readonly defaultMax = this.readPositiveInt(process.env.RATE_LIMIT_MAX, 120);
  private readonly authMax = this.readPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 20);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const skipped = this.reflector.getAllAndOverride<boolean>(skipRateLimitMetadataKey, [
      context.getHandler(),
      context.getClass()
    ]);

    if (skipped) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RateLimitRequest>();
    const key = this.getBucketKey(request);
    const max = this.getMax(request);
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      this.cleanup(now);
      return true;
    }

    current.count += 1;

    if (current.count > max) {
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getBucketKey(request: RateLimitRequest) {
    const ip = this.getClientIp(request);
    const method = request.method ?? 'GET';
    const path = (request.originalUrl ?? request.url ?? '/').split('?')[0];

    return `${ip}:${method}:${path}`;
  }

  private getClientIp(request: RateLimitRequest) {
    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }

  private getMax(request: RateLimitRequest) {
    const path = (request.originalUrl ?? request.url ?? '/').split('?')[0];

    if (path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/auth/forgot-password')) {
      return this.authMax;
    }

    return this.defaultMax;
  }

  private cleanup(now: number) {
    if (this.buckets.size < 10_000) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private readPositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
