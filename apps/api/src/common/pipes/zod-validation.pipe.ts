import { PipeTransform } from '@nestjs/common';
import type { z, ZodTypeAny } from 'zod';
import { parseZodSchema } from '../utils/parse-zod-schema';

export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown) {
    return parseZodSchema(this.schema, value);
  }
}
