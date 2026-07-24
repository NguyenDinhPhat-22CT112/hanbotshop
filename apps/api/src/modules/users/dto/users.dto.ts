import { UserRole, UserStatus } from '@prisma/client';
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional().nullable(),
  phone: z.string().min(6).max(32).optional().nullable()
});

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(24),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  q: z.string().optional()
});

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus)
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole)
});

export const createUserSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional().nullable(),
  phone: z.string().min(6).max(32).optional().nullable(),
  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE)
});

export const addressSchema = z.object({
  recipient: z.string().min(1).max(160),
  phone: z.string().min(6).max(32),
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional().nullable(),
  city: z.string().min(1).max(120),
  province: z.string().max(120).optional().nullable(),
  postalCode: z.string().max(32).optional().nullable(),
  countryCode: z.string().min(2).max(2).default('VN'),
  isDefault: z.boolean().optional().default(false)
});

export const updateAddressSchema = addressSchema.partial();

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type UserListQueryDto = z.infer<typeof userListQuerySchema>;
export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type AddressDto = z.infer<typeof addressSchema>;
export type UpdateAddressDto = z.infer<typeof updateAddressSchema>;
