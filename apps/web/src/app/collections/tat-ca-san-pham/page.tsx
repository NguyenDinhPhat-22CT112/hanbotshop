import type { Metadata } from 'next';
import type { ProductAvailability } from '@hanbotorder/types';
import type { ProductCardModel } from '../../../lib/models';
import { getCategories, getFilterOptions, getProducts } from '../../../lib/api';
import { Breadcrumb } from '../../../components/breadcrumb';
import { CollectionClientNZ } from '../../../components/collection-client-nz';
import { getCatalogViewState } from '../../../lib/catalog-state';

const ribbonLabels: Record<ProductAvailability, string> = {
  PRE_ORDER: 'Pre-order',
  ORDER: 'Order',
  IN_STOCK: 'Có sẵn',
  SALE: 'Sale',
  CONTACT: 'Liên hệ'
};

function formatCollectionPrice(price: string) {
  return price.replace(' VND', 'đ');
}

function pageUrl(searchParams: PageProps['searchParams'], page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page' || value === undefined) continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else params.set(key, value);
  }
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/san-pham${query ? `?${query}` : ''}`;
}

function CollectionProductCard({ product }: { product: ProductCardModel }) {
  const comparePrice = product.compareAtPrice;
  const hasComparePrice = Boolean(comparePrice && comparePrice !== product.price);
  const discountPercent = hasComparePrice
    ? Math.round(((Number(comparePrice!.replace(/[^\d]/g, '')) - Number(product.price.replace(/[^\d]/g, ''))) / Number(comparePrice!.replace(/[^\d]/g, ''))) * 100)
    : 0;

  return (
    <article className="nz-product-card">
      <a className="nz-product-image-link" href={`/products/${product.slug}`}>
        <div className={`nz-product-image product-image--${product.imageTone}`}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} loading="lazy" />
          ) : (
            <div className="nz-product-placeholder">
              <span>{product.name.charAt(0)}</span>
            </div>
          )}

          {(product.status === 'SALE' || product.status === 'PRE_ORDER') && (
            <span className={`nz-product-ribbon ${product.status === 'SALE' ? 'ribbon-sale' : 'ribbon-preorder'}`}>
              {product.status === 'SALE' && discountPercent > 0 ? `-${discountPercent}%` : ribbonLabels[product.status]}
            </span>
          )}

          {product.status === 'CONTACT' && (
            <span className="nz-product-badge badge-contact">Liên hệ</span>
          )}
        </div>
      </a>

      <div className="nz-product-info">
        <p className="nz-product-studio">{product.studio}</p>
        <h3 className="nz-product-name">
          <a href={`/products/${product.slug}`}>{product.name}</a>
        </h3>

        <div className="nz-product-pricing">
          <strong className="nz-price-current">{formatCollectionPrice(product.price)}</strong>
        </div>
      </div>
    </article>
  );
}

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function AllProductsCollectionPage({ searchParams }: PageProps) {
  // Parse filters from URL
  const filters = {
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
    categoryId: typeof searchParams.categoryId === 'string' ? searchParams.categoryId : undefined,
    availability: typeof searchParams.availability === 'string' ? (searchParams.availability as ProductAvailability) : undefined,
    tags: typeof searchParams.tags === 'string' ? searchParams.tags.split(',').filter(Boolean) : undefined,
    studio: typeof searchParams.studio === 'string' ? searchParams.studio : undefined,
    minPrice: typeof searchParams.minPrice === 'string' ? Number(searchParams.minPrice) : undefined,
    maxPrice: typeof searchParams.maxPrice === 'string' ? Number(searchParams.maxPrice) : undefined,
    sortBy: typeof searchParams.sortBy === 'string' ? (searchParams.sortBy as 'createdAt' | 'name' | 'price') : undefined,
    sortOrder: typeof searchParams.sortOrder === 'string' ? (searchParams.sortOrder as 'asc' | 'desc') : undefined,
    page: typeof searchParams.page === 'string' ? Number(searchParams.page) : undefined
  };

  // Fetch data
  let catalogUnavailable = false;
  let result: Awaited<ReturnType<typeof getProducts>> = { data: [], meta: undefined };
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let filterOptions: Awaited<ReturnType<typeof getFilterOptions>> = null;

  try {
    [result, categories, filterOptions] = await Promise.all([getProducts(filters), getCategories(), getFilterOptions()]);
  } catch {
    catalogUnavailable = true;
  }

  const products = result.data;
  const meta = result.meta;
  const categoryPlacement = filters.tags?.some((tag) => tag.toLowerCase() === 'resin')
    ? 'RESIN'
    : filters.availability === 'ORDER'
      ? 'ORDER'
      : null;
  const visibleCategories = categoryPlacement
    ? categories.filter((category) => category.placement === 'BOTH' || category.placement === categoryPlacement)
    : categories;
  const catalogState = getCatalogViewState(catalogUnavailable, products.length);
  const activeTagNames = (filters.tags ?? []).map((tagSlug) => {
    return filterOptions?.tags.find((tag) => tag.slug === tagSlug)?.name ?? tagSlug;
  });
  const breadcrumbLabel = activeTagNames.length === 1
    ? `Tag: “${activeTagNames[0]}”`
    : activeTagNames.length > 1
      ? `Tags: ${activeTagNames.map((tag) => `“${tag}”`).join(', ')}`
      : 'Sản phẩm';

  return (
    <main className="nz-collection-page">
      <Breadcrumb items={[{ label: breadcrumbLabel }]} />

      <div className="nz-collection-container">
        <CollectionClientNZ
          initialCategories={visibleCategories}
          initialFilterOptions={filterOptions}
          currentFilters={filters}
        />

        <div className="nz-collection-main">
          {catalogState === 'unavailable' ? (
            <section className="nz-empty-state" role="alert">
              <h2>Chưa tải được sản phẩm</h2>
              <p>Dịch vụ sản phẩm đang tạm thời gián đoạn. Vui lòng thử lại sau ít phút.</p>
              <a href="/san-pham" className="nz-clear-filters-btn">
                Thử tải lại
              </a>
            </section>
          ) : catalogState === 'ready' ? (
            <>
              <div className="nz-collection-header">
                <h1>Tất cả sản phẩm</h1>
                <span className="nz-product-count">{meta?.total || products.length} sản phẩm</span>
              </div>

              <section className="nz-products-grid" aria-label="Danh sách sản phẩm">
                {products.map((product) => (
                  <CollectionProductCard product={product} key={product.id} />
                ))}
              </section>

              {meta && meta.pageCount > 1 && (
                <nav className="nz-collection-pagination" aria-label="Phân trang sản phẩm">
                  {meta.page > 1 ? <a href={pageUrl(searchParams, meta.page - 1)} rel="prev">← Trang trước</a> : <span aria-disabled="true">← Trang trước</span>}
                  <span>
                    Trang {meta.page} / {meta.pageCount}
                  </span>
                  {meta.page < meta.pageCount ? <a href={pageUrl(searchParams, meta.page + 1)} rel="next">Trang sau →</a> : <span aria-disabled="true">Trang sau →</span>}
                </nav>
              )}
            </>
          ) : (
            <section className="nz-empty-state">
              <h2>Không tìm thấy sản phẩm</h2>
              <p>Không có sản phẩm nào phù hợp với bộ lọc của bạn.</p>
              <a href="/san-pham" className="nz-clear-filters-btn">
                Xóa bộ lọc
              </a>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
export const metadata: Metadata = {
  title: 'Sản phẩm',
  description: 'Danh sách figure, mô hình sưu tầm, hàng có sẵn và sản phẩm pre-order tại Hanbotorder.',
  alternates: { canonical: '/san-pham' }
};
