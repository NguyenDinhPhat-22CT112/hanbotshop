import { BadRequestException } from '@nestjs/common';
import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { parseZodSchema } from './parse-zod-schema';

test('parseZodSchema returns parsed data for valid input', () => {
  const schema = z.object({ page: z.coerce.number().int().positive() });

  assert.deepEqual(parseZodSchema(schema, { page: '2' }), { page: 2 });
});

test('parseZodSchema throws normalized validation error for invalid input', () => {
  const schema = z.object({ email: z.string().email() });

  assert.throws(
    () => parseZodSchema(schema, { email: 'not-an-email' }),
    (error) => {
      assert.ok(error instanceof BadRequestException);
      const response = error.getResponse() as { code: string; message: string; details: unknown[] };
      assert.equal(response.code, 'VALIDATION_ERROR');
      assert.equal(response.message, 'Invalid request.');
      assert.ok(Array.isArray(response.details));
      assert.ok(response.details.length > 0);

      return true;
    }
  );
});
