import { BadRequestException } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';
import { ErrorCode } from '../constants/error-codes';

export function parseZodSchema<T extends ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new BadRequestException({
      code: ErrorCode.ValidationError,
      message: 'Invalid request.',
      details: result.error.issues
    });
  }

  return result.data;
}
