import type { ProductAvailability } from '@hanbotorder/types';
import type { ProductCardModel } from './models';

const apiUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1';

type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  studio: string | null;
  basePrice: string | null;
  compareAtPrice: string | null;
  availability: ProductAvailability;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  depositPercent: number;
  trackInventory: boolean;
  inventoryQuantity: number;
  description: string | null;
  category?: { name: string } | null;
  images?: Array<{ url: string }>;
  tags?: Array<{ name: string; slug: string }>;
  variants?: Array<{
    id: string;
    name: string;
    price: string | null;
    isActive: boolean;
    trackInventory: boolean;
    inventoryQuantity: number;
  }>;
};

type ApiListResponse<T> = {
  data: T[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
};

export type ProductFilters = {
  q?: string;
  categoryId?: string;
  availability?: ProductAvailability;
  tags?: string[];
  studio?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'createdAt' | 'name' | 'price';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type ProductSuggestion = {
  id: string;
  name: string;
  slug: string;
  studio: string | null;
  basePrice: string | null;
  imageUrl: string | null;
  categoryName: string | null;
};

export type FilterOptions = {
  studios: Array<{ name: string; count: number }>;
  tags: Array<{ id: string; name: string; slug: string; count: number }>;
  availabilityOptions: Array<{ value: ProductAvailability; count: number }>;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  placement: 'ORDER' | 'RESIN' | 'BOTH';
  _count: { products: number };
};

export class CatalogApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'CatalogApiError';
  }
}

export async function getProducts(filters?: ProductFilters) {
  const queryParams = new URLSearchParams();

  if (filters?.q) queryParams.set('q', filters.q);
  if (filters?.categoryId) queryParams.set('categoryId', filters.categoryId);
  if (filters?.availability) queryParams.set('availability', filters.availability);
  if (filters?.tags?.length) queryParams.set('tags', filters.tags.join(','));
  if (filters?.studio) queryParams.set('studio', filters.studio);
  if (filters?.minPrice) queryParams.set('minPrice', filters.minPrice.toString());
  if (filters?.maxPrice) queryParams.set('maxPrice', filters.maxPrice.toString());
  if (filters?.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters?.sortOrder) queryParams.set('sortOrder', filters.sortOrder);
  if (filters?.page) queryParams.set('page', filters.page.toString());
  if (filters?.pageSize) queryParams.set('pageSize', filters.pageSize.toString());

  const queryString = queryParams.toString();
  const path = `/products${queryString ? `?${queryString}` : ''}`;
  const response = await safeFetch<ApiListResponse<ApiProduct>>(path);

  return {
    data: response?.data?.map(mapProduct) ?? [],
    meta: response?.meta
  };
}

export async function getProduct(slug: string) {
  const response = await safeFetch<ApiProduct>(`/products/${slug}`);

  if (!response) {
    return null;
  }

  return mapProduct(response);
}

export async function getProductSuggestions(query: string): Promise<ProductSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const response = await safeFetch<{ data: ProductSuggestion[] }>(`/suggestions?q=${encodeURIComponent(query)}`);

  return response?.data ?? [];
}

export async function getFilterOptions(): Promise<FilterOptions | null> {
  return safeFetch<FilterOptions>('/filters/options');
}

export async function getCategories(): Promise<Category[]> {
  const response = await safeFetch<{ data: Category[] }>('/categories');

  return response?.data ?? [];
}

async function safeFetch<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      cache: 'no-store',
      signal: controller.signal
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new CatalogApiError('Dịch vụ sản phẩm đang tạm thời gián đoạn.', response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof CatalogApiError) {
      throw error;
    }

    throw new CatalogApiError('Không thể kết nối tới dịch vụ sản phẩm.');
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapProduct(product: ApiProduct): ProductCardModel {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    studio: product.studio ?? 'Hanbotorder',
    price: product.basePrice ? formatVnd(product.basePrice) : 'Liên hệ shop',
    compareAtPrice: product.compareAtPrice ? formatVnd(product.compareAtPrice) : undefined,
    status: product.availability,
    paymentRequirement: product.paymentRequirement,
    depositPercent: product.depositPercent,
    trackInventory: product.trackInventory,
    inventoryQuantity: product.inventoryQuantity,
    imageTone: imageToneForSlug(product.slug),
    imageUrl: product.images?.[0]?.url,
    images: product.images?.map((image) => image.url) ?? [],
    description: product.description ?? 'Sản phẩm sưu tầm trong danh mục Hanbotorder.',
    category: product.category?.name ?? 'Danh mục',
    tags: product.tags?.map((tag) => tag.name) ?? [],
    tagLinks: product.tags?.map((tag) => ({ name: tag.name, slug: tag.slug })) ?? [],
    variants: product.variants ?? []
  };
}

function imageToneForSlug(slug: string) {
  const tones = ['ruby', 'graphite', 'teal', 'gold', 'violet', 'steel'];
  const charTotal = [...slug].reduce((total, char) => total + char.charCodeAt(0), 0);

  return tones[charTotal % tones.length];
}

function formatVnd(value: string) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  return `${new Intl.NumberFormat('vi-VN').format(numericValue)} VND`;
}
