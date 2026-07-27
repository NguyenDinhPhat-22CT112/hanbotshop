import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductPurchaseActions } from '../../../components/product-purchase-actions';
import { ProductGallery } from '../../../components/product-gallery';
import { ProductPaymentSelector } from '../../../components/product-payment-selector';
import { ResinPrintTemplate } from '../../../components/resin-print-template';
import { getProduct, getProducts } from '../../../lib/api';
import { labelOf } from '../../../lib/labels';
import type { ProductCardModel } from '../../../lib/models';

type ProductDetailPageProps = {
  params: {
    slug: string;
  };
};

// The API container is available at runtime, not while the web image is built.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: 'Không tìm thấy sản phẩm', robots: { index: false, follow: false } };
  const description = product.description.slice(0, 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { type: 'website', title: product.name, description, images: product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : undefined }
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const [product, products] = await Promise.all([getProduct(params.slug), getProducts()]);

  if (!product) {
    notFound();
  }

  const displayPrice = product.price.replace(' VND', 'đ');
  const depositPrice = product.depositPrice?.replace(' VND', 'đ')
    ?? (product.paymentRequirement === 'DEPOSIT' ? estimateDeposit(product.price, product.depositPercent) : null);
  const tagLinks = product.tagLinks ?? (product.tags ?? []).map((tag) => ({ name: tag, slug: slugifyTag(tag) }));
  const relatedProducts = getRelatedProducts(product, products.data);
  const isResinTemplate = isResinProduct(product);
  const numericPrice = Number(product.price.replace(/[^\d]/g, ''));
  const productStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    brand: { '@type': 'Brand', name: product.studio },
    category: product.category,
    offers: numericPrice
      ? {
          '@type': 'Offer',
          priceCurrency: 'VND',
          price: numericPrice,
          availability: product.trackInventory && product.inventoryQuantity <= 0
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/products/${product.slug}`
        }
      : undefined
  };

  return (
    <main className="product-template-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData).replace(/</g, '\\u003c') }}
      />
      <nav className="product-breadcrumb" aria-label="Đường dẫn">
        <a href="/">Trang chủ</a>
        <span>/</span>
        <a href="/collections/tat-ca-san-pham">{product.category}</a>
        <span>/</span>
        <span>{product.name}</span>
      </nav>

      {isResinTemplate ? (
        <ResinPrintTemplate
          productId={product.id}
          productName={product.name}
          price={displayPrice}
          imageUrl={product.imageUrl}
          imageTone={product.imageTone}
          category={product.category}
          paymentRequirement={product.paymentRequirement}
          depositPercent={product.depositPercent}
        />
      ) : (
        <section className="product-template">
        <ProductGallery
          productName={product.name}
          category={product.category}
          imageTone={product.imageTone}
          images={product.images ?? []}
        />

        <div className="product-purchase-panel">
          <p className="studio">{product.studio}</p>
          <h1>{product.name}</h1>

          <ProductPaymentSelector fullPrice={displayPrice} depositPrice={depositPrice} />

          <ProductPurchaseActions
            productId={product.id}
            productName={product.name}
            productImageUrl={product.imageUrl}
            paymentRequirement={product.paymentRequirement}
            depositPercent={product.depositPercent}
            variants={product.variants ?? []}
            basePrice={product.price.replace(' VND', '').replace(/\./g, '')}
            purchaseAllowed={product.variants?.length ? product.variants.some((variant) => variant.isActive && (!variant.trackInventory || variant.inventoryQuantity > 0)) : (!product.trackInventory || product.inventoryQuantity > 0)}
          />

          <div className="hanbot-care">
            <article>
              <strong>Cam kết Hanbot</strong>
              <span>Tư vấn trước khi chốt đơn, lưu lịch thanh toán và cập nhật tiến độ rõ ràng.</span>
            </article>
            <article>
              <strong>Hỗ trợ nhanh</strong>
              <span>Nhắn shop để kiểm tra tình trạng hàng, cọc và phương án giao hàng.</span>
            </article>
          </div>

          <section className="product-info-block">
            <div className="product-info-heading">
              <h2>Thông tin sản phẩm</h2>
              <span>−</span>
            </div>
            <dl>
              <div>
                <dt>{labelOf(product.status)}</dt>
                <dd>{product.description}</dd>
              </div>
              <div>
                <dt>Thông tin sản phẩm</dt>
                <dd>{product.name}</dd>
              </div>
              <div>
                <dt>Hãng</dt>
                <dd>{product.studio}</dd>
              </div>
              <div>
                <dt>Danh mục</dt>
                <dd>{product.category}</dd>
              </div>
              <div>
                <dt>Giá</dt>
                <dd>{displayPrice}</dd>
              </div>
              {depositPrice ? (
                <div>
                  <dt>Cọc dự kiến</dt>
                  <dd>{depositPrice}</dd>
                </div>
              ) : null}
              {product.trackInventory ? (
                <div>
                  <dt>Tồn kho</dt>
                  <dd>{product.inventoryQuantity > 0 ? `Còn ${product.inventoryQuantity} sản phẩm` : 'Hết hàng'}</dd>
                </div>
              ) : null}
              <div>
                <dt>Ghi chú</dt>
                <dd>Giá được chốt khi thanh toán. Phí giao hàng và lịch giao sẽ được shop xác nhận theo từng đơn.</dd>
              </div>
            </dl>
          </section>

          <section className="product-collapsible">
            <h2>Dịch vụ giao hàng</h2>
            <span>+</span>
          </section>

          {tagLinks.length ? (
            <nav className="product-tags" aria-label="Tag sản phẩm">
              <strong>Tags:</strong>
              {tagLinks.map((tag) => (
                <a href={`/collections/tat-ca-san-pham?tags=${encodeURIComponent(tag.slug)}`} key={tag.slug}>{tag.name}</a>
              ))}
            </nav>
          ) : null}
        </div>
        </section>
      )}

      <section className="related-products-section">
        <div className="related-heading">
          <p>Cùng loại, danh mục hoặc tag</p>
          <h2>Sản phẩm liên quan</h2>
        </div>
        <div className="related-products-row">
          {relatedProducts.map((item) => (
            <article className="related-product-card" key={item.id}>
              <a className={`related-product-image product-image--${item.imageTone}`} href={`/products/${item.slug}`}>
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>{item.category}</span>}
                <i>{labelOf(item.status)}</i>
              </a>
              <p>{item.studio}</p>
              <h3>
                <a href={`/products/${item.slug}`}>{item.name}</a>
              </h3>
              <strong>{item.price.replace(' VND', 'đ')}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function getRelatedProducts(product: ProductCardModel, products: ProductCardModel[]) {
  const productIsResin = isResinProduct(product);
  const productTags = new Set(
    (product.tags ?? [])
      .map(normalizeRelatedTag)
      .filter((tag) => tag && tag !== 'order' && tag !== 'resin')
  );
  const candidates = products.filter((item) => item.slug !== product.slug);
  const scoredProducts = candidates
    .map((item) => ({
      item,
      sameType: isResinProduct(item) === productIsResin,
      sameCategory: Boolean(
        product.category &&
        product.category !== 'Danh mục' &&
        item.category === product.category
      ),
      sharedTagCount: new Set(
        (item.tags ?? [])
          .map(normalizeRelatedTag)
          .filter((tag) => tag && tag !== 'order' && tag !== 'resin' && productTags.has(tag))
      ).size,
      sameAvailability: item.status === product.status
    }))
    .sort((left, right) => {
      if (left.sameType !== right.sameType) return Number(right.sameType) - Number(left.sameType);
      if (left.sameCategory !== right.sameCategory) return Number(right.sameCategory) - Number(left.sameCategory);
      if (left.sharedTagCount !== right.sharedTagCount) return right.sharedTagCount - left.sharedTagCount;
      if (left.sameAvailability !== right.sameAvailability) {
        return Number(right.sameAvailability) - Number(left.sameAvailability);
      }

      return left.item.name.localeCompare(right.item.name, 'vi');
    });

  return scoredProducts.slice(0, 5).map(({ item }) => item);
}

function normalizeRelatedTag(tag: string) {
  return tag.trim().toLowerCase();
}

function isResinProduct(product: ProductCardModel) {
  const haystack = [product.slug, product.name, product.category, product.studio, ...(product.tags ?? [])].join(' ').toLowerCase();

  return haystack.includes('resin');
}

function estimateDeposit(price: string, percent: number) {
  const numericValue = Number(price.replace(/[^\d]/g, ''));

  if (!numericValue) {
    return null;
  }

  return `${new Intl.NumberFormat('vi-VN').format(Math.round(numericValue * percent / 100))}đ`;
}

function slugifyTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
