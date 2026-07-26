import { StatusBadge } from '@hanbotorder/ui';
import Link from 'next/link';
import type { ProductCardModel } from '../lib/models';
import { AddToCartButton } from './add-to-cart-button';

type ProductCardProps = {
  product: ProductCardModel;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-card">
      <Link className={`product-image product-image--${product.imageTone}`} href={`/products/${product.slug}`} aria-label={product.name}>
        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>{product.category}</span>}
      </Link>
      <StatusBadge status={product.status} />
      <p className="studio">{product.studio}</p>
      <h3>
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
      </h3>
      <p className="price">
        {product.price}
      </p>
      {product.variants?.length ? (
        <Link className="product-select-link" href={`/products/${product.slug}`}>Chọn phiên bản</Link>
      ) : (
        <AddToCartButton
          productId={product.id}
          productName={product.name}
          productImageUrl={product.imageUrl}
          unitPrice={product.price}
          paymentRequirement={product.paymentRequirement}
          depositPercent={product.depositPercent}
          disabled={product.trackInventory && product.inventoryQuantity <= 0}
          label={product.trackInventory && product.inventoryQuantity <= 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
        />
      )}
    </article>
  );
}
