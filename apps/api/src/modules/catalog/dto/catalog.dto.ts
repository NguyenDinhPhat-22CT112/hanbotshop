import { CategoryPlacement, PaymentRequirement, ProductAvailability, ProductStatus } from '@prisma/client';
import { z } from 'zod';

const optionalDate = z
  .string()
  .datetime()
  .optional()
  .nullable()
  .transform((value) => (value ? new Date(value) : null));

const optionalPrice = z
  .union([z.string().min(1), z.number()])
  .optional()
  .nullable()
  .transform((value) => (value === undefined || value === null || value === '' ? null : value));

export const createCategorySchema = z.object({
  name: z.string().min(1).max(160),
  slug: z.string().min(1).max(180),
  parentId: z.string().min(1).optional().nullable(),
  placement: z.nativeEnum(CategoryPlacement).optional()
});

export const updateCategorySchema = createCategorySchema.partial();

export const createProductVariantSchema = z.object({
  sku: z.string().min(1).max(120).optional().nullable(),
  name: z.string().min(1).max(160),
  options: z.record(z.unknown()).optional().nullable(),
  price: optionalPrice,
  isActive: z.boolean().optional(),
  trackInventory: z.boolean().optional(),
  inventoryQuantity: z.number().int().min(0).optional()
});

export const updateProductVariantSchema = createProductVariantSchema.partial();

export const productImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().max(220).optional().nullable(),
  sortOrder: z.number().int().min(0).optional()
});

export const updateProductImageSchema = productImageSchema.partial();

export const createProductSchema = z.object({
  categoryId: z.string().min(1).optional().nullable(),
  name: z.string().min(1).max(220),
  slug: z.string().min(1).max(240),
  description: z.string().max(5000).optional().nullable(),
  studio: z.string().max(180).optional().nullable(),
  status: z.nativeEnum(ProductStatus).optional(),
  availability: z.nativeEnum(ProductAvailability).optional(),
  basePrice: optionalPrice,
  compareAtPrice: optionalPrice,
  preorderOpenAt: optionalDate,
  preorderCloseAt: optionalDate,
  estimatedReadyAt: optionalDate,
  paymentRequirement: z.nativeEnum(PaymentRequirement).optional(),
  depositPercent: z.number().int().min(1).max(100).optional(),
  trackInventory: z.boolean().optional(),
  inventoryQuantity: z.number().int().min(0).optional(),
  variants: z.array(createProductVariantSchema).optional(),
  tags: z.array(z.string().min(1).max(80)).max(30).optional(),
  images: z.array(productImageSchema).max(20).optional()
}).superRefine((value, context) => {
  if (value.preorderOpenAt && value.preorderCloseAt && value.preorderOpenAt >= value.preorderCloseAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['preorderCloseAt'], message: 'Pre-order close time must be after open time.' });
  }
  if (value.paymentRequirement === PaymentRequirement.DEPOSIT && value.availability !== ProductAvailability.PRE_ORDER) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['paymentRequirement'], message: 'Deposit payment is only supported for pre-order products.' });
  }
});

export const updateProductSchema = createProductSchema._def.schema
  .omit({ variants: true })
  .partial()
  .extend({
    variants: z.array(updateProductVariantSchema.extend({ id: z.string().min(1).optional() })).optional()
  });

export const productListQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  availability: z.nativeEnum(ProductAvailability).optional(),
  tag: z.string().optional(),
  tags: z.string().optional().transform((val) => val?.split(',').filter(Boolean)),
  studio: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sortBy: z.enum(['createdAt', 'name', 'price']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(24)
});

export const adminProductListQuerySchema = productListQuerySchema.extend({
  status: z.nativeEnum(ProductStatus).optional()
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CreateProductVariantDto = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantDto = z.infer<typeof updateProductVariantSchema>;
export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type ProductListQueryDto = z.infer<typeof productListQuerySchema>;
export type AdminProductListQueryDto = z.infer<typeof adminProductListQuerySchema>;
export type ProductImageDto = z.infer<typeof productImageSchema>;
export type UpdateProductImageDto = z.infer<typeof updateProductImageSchema>;
