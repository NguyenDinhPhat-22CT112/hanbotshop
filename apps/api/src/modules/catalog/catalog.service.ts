import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AdminProductListQueryDto,
  CreateCategoryDto,
  CreateProductDto,
  CreateProductVariantDto,
  ProductImageDto,
  ProductListQueryDto,
  UpdateCategoryDto,
  UpdateProductImageDto,
  UpdateProductDto,
  UpdateProductVariantDto
} from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) { }

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      where: { status: CategoryStatus.ACTIVE },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    return { data: categories };
  }

  async createCategory(dto: CreateCategoryDto) {
    await this.ensureCategorySlugAvailable(dto.slug);

    if (dto.parentId) {
      await this.ensureCategoryExists(dto.parentId);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId ?? null,
        placement: dto.placement
      }
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(id);

    if (dto.slug) {
      await this.ensureCategorySlugAvailable(dto.slug, id);
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('Category cannot be its own parent.');
      }

      await this.ensureCategoryExists(dto.parentId);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId === undefined ? undefined : dto.parentId,
        placement: dto.placement
      }
    });
  }

  async deleteCategory(id: string) {
    await this.ensureCategoryExists(id);

    return this.prisma.category.update({
      where: { id },
      data: { status: CategoryStatus.ARCHIVED }
    });
  }

  async listProducts(query: ProductListQueryDto) {
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      categoryId: query.categoryId,
      availability: query.availability,
      studio: query.studio ? { contains: query.studio, mode: 'insensitive' } : undefined,
      basePrice:
        query.minPrice || query.maxPrice
          ? {
            gte: query.minPrice ? new Prisma.Decimal(query.minPrice) : undefined,
            lte: query.maxPrice ? new Prisma.Decimal(query.maxPrice) : undefined
          }
          : undefined,
      tags:
        query.tag || query.tags
          ? {
            some: {
              tag: {
                slug: {
                  in: query.tags?.map((tag) => this.slugify(tag)) ?? [this.slugify(query.tag ?? '')]
                }
              }
            }
          }
          : undefined,
      OR: query.q
        ? [
          { name: { contains: query.q, mode: 'insensitive' } },
          { studio: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } }
        ]
        : undefined
    };

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    return this.listProductsByWhere(where, query.page, query.pageSize, orderBy);
  }

  async listProductsForAdmin(query: AdminProductListQueryDto) {
    const where: Prisma.ProductWhereInput = {
      status: query.status,
      categoryId: query.categoryId,
      availability: query.availability,
      studio: query.studio ? { contains: query.studio, mode: 'insensitive' } : undefined,
      basePrice:
        query.minPrice || query.maxPrice
          ? {
            gte: query.minPrice ? new Prisma.Decimal(query.minPrice) : undefined,
            lte: query.maxPrice ? new Prisma.Decimal(query.maxPrice) : undefined
          }
          : undefined,
      tags:
        query.tag || query.tags
          ? {
            some: {
              tag: {
                slug: {
                  in: query.tags?.map((tag) => this.slugify(tag)) ?? [this.slugify(query.tag ?? '')]
                }
              }
            }
          }
          : undefined,
      OR: query.q
        ? [
          { name: { contains: query.q, mode: 'insensitive' } },
          { studio: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } }
        ]
        : undefined
    };

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    return this.listProductsByWhere(where, query.page, query.pageSize, orderBy);
  }

  private async listProductsByWhere(
    where: Prisma.ProductWhereInput,
    page: number,
    pageSize: number,
    orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = { createdAt: 'desc' }
  ) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: this.productInclude()
      }),
      this.prisma.product.count({ where })
    ]);

    return {
      data: items.map((product) => this.serializeProduct(product)),
      meta: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        status: ProductStatus.ACTIVE,
        slug
      },
      include: this.productInclude()
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return this.serializeProduct(product);
  }

  async createProduct(dto: CreateProductDto) {
    await this.ensureProductSlugAvailable(dto.slug);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const productId = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          categoryId: dto.categoryId ?? null,
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? null,
          studio: dto.studio ?? null,
          status: dto.status,
          availability: dto.availability,
          basePrice: this.toDecimal(dto.basePrice),
          compareAtPrice: this.toDecimal(dto.compareAtPrice),
          preorderOpenAt: dto.preorderOpenAt,
          preorderCloseAt: dto.preorderCloseAt,
          estimatedReadyAt: dto.estimatedReadyAt,
          paymentRequirement: dto.paymentRequirement,
          depositPercent: dto.depositPercent,
          trackInventory: dto.trackInventory,
          inventoryQuantity: dto.inventoryQuantity,
          variants: dto.variants?.length
            ? {
              create: dto.variants.map((variant) => ({
                sku: variant.sku ?? null,
                name: variant.name,
                options: variant.options as Prisma.InputJsonValue,
                price: this.toDecimal(variant.price),
                isActive: variant.isActive ?? true,
                trackInventory: variant.trackInventory ?? false,
                inventoryQuantity: variant.inventoryQuantity ?? 0
              }))
            }
            : undefined,
          images: dto.images?.length
            ? {
              create: dto.images.map((image, index) => ({
                url: image.url,
                altText: image.altText ?? dto.name,
                sortOrder: image.sortOrder ?? index
              }))
            }
            : undefined
        }
      });

      await this.replaceProductTags(tx, product.id, dto.tags);

      return product.id;
    });

    return this.getProductForAdmin(productId);
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.ensureProductExists(id);

    if (dto.slug) {
      await this.ensureProductSlugAvailable(dto.slug, id);
    }

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        categoryId: dto.categoryId === undefined ? undefined : dto.categoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description === undefined ? undefined : dto.description,
        studio: dto.studio === undefined ? undefined : dto.studio,
        status: dto.status,
        availability: dto.availability,
        basePrice: dto.basePrice === undefined ? undefined : this.toDecimal(dto.basePrice),
        compareAtPrice: dto.compareAtPrice === undefined ? undefined : this.toDecimal(dto.compareAtPrice),
        preorderOpenAt: dto.preorderOpenAt === undefined ? undefined : dto.preorderOpenAt,
        preorderCloseAt: dto.preorderCloseAt === undefined ? undefined : dto.preorderCloseAt,
        estimatedReadyAt: dto.estimatedReadyAt === undefined ? undefined : dto.estimatedReadyAt
        ,paymentRequirement: dto.paymentRequirement
        ,depositPercent: dto.depositPercent
        ,trackInventory: dto.trackInventory
        ,inventoryQuantity: dto.inventoryQuantity
      }
    });

    if (dto.variants) {
      await this.replaceProductVariants(id, dto.variants);
    }

    if (dto.tags) {
      await this.prisma.$transaction((tx) => this.replaceProductTags(tx, id, dto.tags));
    }

    if (dto.images) {
      await this.replaceProductImages(id, dto.images);
    }

    return this.getProductForAdmin(id);
  }

  async deleteProduct(id: string) {
    await this.ensureProductExists(id);

    return this.prisma.$transaction(async (tx) => {
      // Order items retain their product snapshot, but no longer reference the deleted product.
      await tx.orderItem.updateMany({ where: { productId: id }, data: { productId: null } });
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.productTag.deleteMany({ where: { productId: id } });
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      return tx.product.delete({ where: { id } });
    });
  }

  async addProductImage(productId: string, dto: ProductImageDto) {
    await this.ensureProductExists(productId);

    return this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        altText: dto.altText ?? null,
        sortOrder: dto.sortOrder ?? 0
      }
    });
  }

  async addProductVariant(productId: string, dto: CreateProductVariantDto) {
    await this.ensureProductExists(productId);

    await this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku ?? null,
        name: dto.name,
        options: dto.options as Prisma.InputJsonValue,
        price: this.toDecimal(dto.price),
        isActive: dto.isActive ?? true,
        trackInventory: dto.trackInventory ?? false,
        inventoryQuantity: dto.inventoryQuantity ?? 0
      }
    });

    return this.getProductForAdmin(productId);
  }

  async updateProductVariant(productId: string, variantId: string, dto: UpdateProductVariantDto) {
    await this.ensureVariantBelongsToProduct(productId, variantId);

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: dto.sku === undefined ? undefined : dto.sku,
        name: dto.name,
        options: dto.options === undefined ? undefined : (dto.options as Prisma.InputJsonValue),
        price: dto.price === undefined ? undefined : this.toDecimal(dto.price),
        isActive: dto.isActive,
        trackInventory: dto.trackInventory,
        inventoryQuantity: dto.inventoryQuantity
      }
    });

    return this.getProductForAdmin(productId);
  }

  async deleteProductVariant(productId: string, variantId: string) {
    await this.ensureVariantBelongsToProduct(productId, variantId);

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false }
    });

    return this.getProductForAdmin(productId);
  }

  async updateProductImage(productId: string, imageId: string, dto: UpdateProductImageDto) {
    await this.ensureImageBelongsToProduct(productId, imageId);

    await this.prisma.productImage.update({
      where: { id: imageId },
      data: {
        url: dto.url,
        altText: dto.altText === undefined ? undefined : dto.altText,
        sortOrder: dto.sortOrder
      }
    });

    return this.getProductForAdmin(productId);
  }

  async deleteProductImage(productId: string, imageId: string) {
    await this.ensureImageBelongsToProduct(productId, imageId);
    await this.prisma.productImage.delete({ where: { id: imageId } });

    return this.getProductForAdmin(productId);
  }

  async getProductSuggestions(query: string) {
    if (!query || query.length < 2) {
      return { data: [] };
    }

    const products = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { studio: { contains: query, mode: 'insensitive' } },
          { category: { name: { contains: query, mode: 'insensitive' } } }
        ]
      },
      take: 8,
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1
        }
      }
    });

    const suggestions = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      studio: product.studio,
      basePrice: product.basePrice?.toString() ?? null,
      imageUrl: product.images[0]?.url ?? null,
      categoryName: product.category?.name ?? null
    }));

    // Sort by relevance: exact name match first, then partial matches
    suggestions.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
      const bNameMatch = b.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;

      return aNameMatch - bNameMatch;
    });

    return { data: suggestions };
  }

  async getFilterOptions() {
    const [studios, tags, availabilityOptions] = await Promise.all([
      // Get distinct studios with counts
      this.prisma.product.groupBy({
        by: ['studio'],
        where: {
          status: ProductStatus.ACTIVE,
          studio: { not: null }
        },
        _count: true
      }),
      // Get all tags with product counts
      this.prisma.tag.findMany({
        include: {
          _count: {
            select: {
              products: {
                where: {
                  product: {
                    status: ProductStatus.ACTIVE
                  }
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      // Get availability options with counts
      this.prisma.product.groupBy({
        by: ['availability'],
        where: {
          status: ProductStatus.ACTIVE
        },
        _count: true
      })
    ]);

    return {
      studios: studios
        .filter((item) => item.studio)
        .map((item) => ({
          name: item.studio!,
          count: item._count
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      tags: tags
        .filter((tag) => tag._count.products > 0)
        .map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          count: tag._count.products
        })),
      availabilityOptions: availabilityOptions.map((item) => ({
        value: item.availability,
        count: item._count
      }))
    };
  }

  private async replaceProductVariants(productId: string, variants: UpdateProductDto['variants']) {
    if (!variants) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({
        where: {
          productId,
          id: { notIn: variants.flatMap((variant) => (variant.id ? [variant.id] : [])) }
        }
      });

      for (const variant of variants) {
        if (variant.id) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              sku: variant.sku === undefined ? undefined : variant.sku,
              name: variant.name,
              options: variant.options === undefined ? undefined : (variant.options as Prisma.InputJsonValue),
              price: variant.price === undefined ? undefined : this.toDecimal(variant.price),
              isActive: variant.isActive,
              trackInventory: variant.trackInventory,
              inventoryQuantity: variant.inventoryQuantity
            }
          });
          continue;
        }

        if (!variant.name) {
          throw new ConflictException('New product variants require a name.');
        }

        await tx.productVariant.create({
          data: {
            productId,
            sku: variant.sku ?? null,
            name: variant.name,
            options: variant.options as Prisma.InputJsonValue,
            price: this.toDecimal(variant.price),
            isActive: variant.isActive ?? true,
            trackInventory: variant.trackInventory ?? false,
            inventoryQuantity: variant.inventoryQuantity ?? 0
          }
        });
      }
    });
  }

  private async replaceProductImages(productId: string, images: UpdateProductDto['images']) {
    if (!images) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId } });

      if (!images.length) {
        return;
      }

      await tx.productImage.createMany({
        data: images.map((image, index) => ({
          productId,
          url: image.url,
          altText: image.altText ?? null,
          sortOrder: image.sortOrder ?? index
        }))
      });
    });
  }

  private async replaceProductTags(tx: Prisma.TransactionClient, productId: string, tagNames: string[] | undefined) {
    if (!tagNames) {
      return;
    }

    const uniqueTagNames = [...new Map(tagNames.map((name) => [this.slugify(name), name.trim()])).values()].filter(Boolean);
    await tx.productTag.deleteMany({ where: { productId } });

    for (const name of uniqueTagNames) {
      const slug = this.slugify(name);

      if (!slug) {
        continue;
      }

      const tag = await tx.tag.upsert({
        where: { slug },
        update: { name },
        create: { name, slug }
      });

      await tx.productTag.create({
        data: {
          productId,
          tagId: tag.id
        }
      });
    }
  }

  private async ensureCategoryExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  private async ensureProductExists(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return product;
  }

  private async ensureVariantBelongsToProduct(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId
      }
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found.');
    }

    return variant;
  }

  private async ensureImageBelongsToProduct(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId
      }
    });

    if (!image) {
      throw new NotFoundException('Product image not found.');
    }

    return image;
  }

  async getProductForAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.productInclude()
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    return this.serializeProduct(product);
  }

  private async ensureCategorySlugAvailable(slug: string, currentId?: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });

    if (category && category.id !== currentId) {
      throw new ConflictException('Category slug is already used.');
    }
  }

  private async ensureProductSlugAvailable(slug: string, currentId?: string) {
    const product = await this.prisma.product.findUnique({ where: { slug } });

    if (product && product.id !== currentId) {
      throw new ConflictException('Product slug is already used.');
    }
  }

  private productInclude() {
    return {
      category: true,
      variants: {
        orderBy: { createdAt: 'asc' as const }
      },
      images: {
        orderBy: { sortOrder: 'asc' as const }
      },
      tags: {
        include: {
          tag: true
        },
        orderBy: {
          tag: {
            name: 'asc' as const
          }
        }
      }
    };
  }

  private serializeProduct(product: Prisma.ProductGetPayload<{ include: ReturnType<CatalogService['productInclude']> }>) {
    return {
      ...product,
      basePrice: product.basePrice?.toString() ?? null,
      compareAtPrice: product.compareAtPrice?.toString() ?? null,
      variants: product.variants.map((variant) => ({
        ...variant,
        price: variant.price?.toString() ?? null
      })),
      images: product.images.map((image) => ({ ...image, url: this.publicProductImageUrl(image.url) })),
      tags: product.tags.map((item) => item.tag)
    };
  }

  private publicProductImageUrl(url: string) {
    const endpoint = process.env.CLOUD_STORAGE_ENDPOINT?.replace(/\/$/, '');
    const bucket = process.env.CLOUD_STORAGE_BUCKET;
    const prefix = endpoint && bucket ? `${endpoint}/${bucket}/` : '';
    if (!prefix || !url.startsWith(prefix)) return url;
    const key = url.slice(prefix.length);
    const apiUrl = (process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '');
    return `${apiUrl}/files/public?key=${encodeURIComponent(key)}`;
  }

  private toDecimal(value: string | number | null | undefined) {
    return value === undefined || value === null ? null : new Prisma.Decimal(value);
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private buildOrderBy(sortBy?: string, sortOrder?: string): Prisma.ProductOrderByWithRelationInput {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'name':
        return { name: order };
      case 'price':
        return { basePrice: order };
      case 'createdAt':
      default:
        return { createdAt: order };
    }
  }
}
