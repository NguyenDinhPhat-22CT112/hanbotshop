import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { parseZodSchema } from '../../common/utils/parse-zod-schema';
import { Roles } from '../identity/decorators/roles.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { CatalogService } from './catalog.service';
import {
  adminProductListQuerySchema,
  createCategorySchema,
  createProductSchema,
  createProductVariantSchema,
  productImageSchema,
  productListQuerySchema,
  updateCategorySchema,
  updateProductImageSchema,
  updateProductSchema,
  updateProductVariantSchema,
} from './dto/catalog.dto';

@ApiTags('Catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) { }

  @Get('categories')
  @ApiOperation({ summary: 'List all categories', description: 'Get hierarchical list of product categories' })
  @ApiResponse({ status: 200, description: 'List of categories with product counts' })
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Post('categories')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create category', description: 'Create a new product category (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'slug'],
      properties: {
        name: { type: 'string', example: 'Gundam' },
        slug: { type: 'string', example: 'gundam' },
        parentId: { type: 'string', nullable: true, example: null },
        placement: { type: 'string', enum: ['ORDER', 'RESIN', 'BOTH'], example: 'BOTH' }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 409, description: 'Category slug already exists' })
  createCategory(@Body() body: unknown) {
    const dto = parseZodSchema(createCategorySchema, body);

    return this.catalogService.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update category', description: 'Update category details (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  updateCategory(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateCategorySchema, body);

    return this.catalogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete category', description: 'Delete a product category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  deleteCategory(@Param('id') id: string) {
    return this.catalogService.deleteCategory(id);
  }

  @Get('products')
  @ApiOperation({ summary: 'List products', description: 'Get paginated list of products with filters and sorting' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'availability', required: false, enum: ['PRE_ORDER', 'ORDER', 'IN_STOCK', 'SALE', 'CONTACT'], description: 'Availability filter' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category ID' })
  @ApiQuery({ name: 'tag', required: false, type: String, description: 'Filter by single tag name' })
  @ApiQuery({ name: 'tags', required: false, type: String, description: 'Filter by multiple tags (comma-separated)' })
  @ApiQuery({ name: 'studio', required: false, type: String, description: 'Filter by studio/brand name' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'name', 'price'], description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query (name, studio, description)' })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  listProducts(@Query() query: Record<string, unknown>) {
    const dto = parseZodSchema(productListQuerySchema, query);

    return this.catalogService.listProducts(dto);
  }

  @Get('admin/products')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all products for admin', description: 'Get paginated product list including draft and archived products (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], description: 'Product status filter' })
  @ApiQuery({ name: 'availability', required: false, enum: ['PRE_ORDER', 'ORDER', 'IN_STOCK', 'SALE', 'CONTACT'], description: 'Availability filter' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category ID' })
  @ApiQuery({ name: 'tag', required: false, type: String, description: 'Filter by tag name' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search query (name, studio, description)' })
  @ApiResponse({ status: 200, description: 'Paginated admin product list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  listProductsForAdmin(@Query() query: Record<string, unknown>) {
    const dto = parseZodSchema(adminProductListQuerySchema, query);

    return this.catalogService.listProductsForAdmin(dto);
  }

  @Get('admin/products/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get product for admin', description: 'Get product details by ID including draft and archived products (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product details with variants, images, and tags' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getProductForAdmin(@Param('id') id: string) {
    return this.catalogService.getProductForAdmin(id);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product', description: 'Get public product details by slug' })
  @ApiParam({ name: 'slug', description: 'Product slug', example: 'gundam-rx-78-2' })
  @ApiResponse({ status: 200, description: 'Product details with variants, images, and tags' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getProduct(@Param('slug') slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get product suggestions', description: 'Get autocomplete suggestions for search query' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query (minimum 2 characters)' })
  @ApiResponse({ status: 200, description: 'List of up to 8 product suggestions' })
  @ApiResponse({ status: 400, description: 'Query too short' })
  getProductSuggestions(@Query('q') query: string) {
    return this.catalogService.getProductSuggestions(query);
  }

  @Get('filters/options')
  @ApiOperation({ summary: 'Get filter options', description: 'Get available filter values for studios, tags, and availability' })
  @ApiResponse({ status: 200, description: 'Available filter options with product counts' })
  getFilterOptions() {
    return this.catalogService.getFilterOptions();
  }

  @Post('products')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create product', description: 'Create a new product with variants and images (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'slug', 'status', 'availability'],
      properties: {
        categoryId: { type: 'string', nullable: true },
        name: { type: 'string', example: 'RG 1/144 RX-78-2 Gundam' },
        slug: { type: 'string', example: 'rg-rx-78-2-gundam' },
        description: { type: 'string', example: 'Real Grade Gundam from Mobile Suit Gundam' },
        studio: { type: 'string', example: 'Bandai' },
        status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], example: 'ACTIVE' },
        availability: { type: 'string', enum: ['PRE_ORDER', 'ORDER', 'IN_STOCK', 'SALE', 'CONTACT'], example: 'PRE_ORDER' },
        basePrice: { type: 'number', example: 950000 },
        compareAtPrice: { type: 'number', nullable: true, example: 1200000 },
        preorderOpenAt: { type: 'string', format: 'date-time', nullable: true },
        preorderCloseAt: { type: 'string', format: 'date-time', nullable: true },
        estimatedReadyAt: { type: 'string', format: 'date-time', nullable: true },
        tags: { type: 'array', items: { type: 'string' }, example: ['Gundam', 'RG', 'Bandai'] },
        variants: { type: 'array', items: { type: 'object' } },
        images: { type: 'array', items: { type: 'object' } }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 409, description: 'Product slug already exists' })
  createProduct(@Body() body: unknown) {
    const dto = parseZodSchema(createProductSchema, body);

    return this.catalogService.createProduct(dto);
  }

  @Patch('products/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update product', description: 'Update product details (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  updateProduct(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateProductSchema, body);

    return this.catalogService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete product', description: 'Permanently delete a product and its catalog data (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product permanently deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  deleteProduct(@Param('id') id: string) {
    return this.catalogService.deleteProduct(id);
  }

  @Post('products/:id/images')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add product image', description: 'Add an image to a product (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string', format: 'uri', example: 'https://cdn.example.com/products/gundam-rx-78-2.jpg' },
        altText: { type: 'string', example: 'RX-78-2 Gundam front view' },
        sortOrder: { type: 'number', example: 0 }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Image added successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  addProductImage(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(productImageSchema, body);

    return this.catalogService.addProductImage(id, dto);
  }

  @Post('products/:id/variants')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add product variant', description: 'Add a variant to a product (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 201, description: 'Variant added successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  addProductVariant(@Param('id') id: string, @Body() body: unknown) {
    const dto = parseZodSchema(createProductVariantSchema, body);

    return this.catalogService.addProductVariant(id, dto);
  }

  @Patch('products/:id/variants/:variantId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update product variant', description: 'Update a product variant (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'variantId', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  updateProductVariant(@Param('id') id: string, @Param('variantId') variantId: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateProductVariantSchema, body);

    return this.catalogService.updateProductVariant(id, variantId, dto);
  }

  @Delete('products/:id/variants/:variantId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete product variant', description: 'Soft delete a product variant by marking it inactive (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'variantId', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Variant archived successfully' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  deleteProductVariant(@Param('id') id: string, @Param('variantId') variantId: string) {
    return this.catalogService.deleteProductVariant(id, variantId);
  }

  @Patch('products/:id/images/:imageId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update product image', description: 'Update a product image (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'imageId', description: 'Image ID' })
  @ApiResponse({ status: 200, description: 'Image updated successfully' })
  @ApiResponse({ status: 404, description: 'Product image not found' })
  updateProductImage(@Param('id') id: string, @Param('imageId') imageId: string, @Body() body: unknown) {
    const dto = parseZodSchema(updateProductImageSchema, body);

    return this.catalogService.updateProductImage(id, imageId, dto);
  }

  @Delete('products/:id/images/:imageId')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete product image', description: 'Delete a product image (Admin only)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'imageId', description: 'Image ID' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product image not found' })
  deleteProductImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.catalogService.deleteProductImage(id, imageId);
  }
}
