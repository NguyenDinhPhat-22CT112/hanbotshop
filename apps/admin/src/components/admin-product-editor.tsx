'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { labelOf } from '../lib/labels';
import { ProductImageUploader } from './product-image-uploader';
import { TagPicker } from './tag-picker';

type Category = {
  id: string;
  name: string;
};

type ProductVariant = {
  id?: string;
  sku?: string | null;
  name: string;
  price?: string | null;
  isActive: boolean;
  trackInventory: boolean;
  inventoryQuantity: number;
};

type ProductImage = {
  id?: string;
  url: string;
  altText?: string | null;
  sortOrder?: number | null;
};

type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  studio: string | null;
  description: string | null;
  categoryId?: string | null;
  status: string;
  availability: string;
  basePrice: string | null;
  compareAtPrice: string | null;
  preorderOpenAt?: string | null;
  preorderCloseAt?: string | null;
  estimatedReadyAt?: string | null;
  paymentRequirement: string;
  depositPercent: number;
  trackInventory: boolean;
  inventoryQuantity: number;
  tags?: Array<{ name: string }>;
  variants?: ProductVariant[];
  images?: ProductImage[];
};

const productStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const availabilityOptions = ['PRE_ORDER', 'ORDER', 'IN_STOCK', 'SALE', 'CONTACT'];

function emptyVariant(): ProductVariant {
  return { name: '', sku: '', price: '', isActive: true, trackInventory: false, inventoryQuantity: 0 };
}

export function AdminProductEditor({ id }: { id: string }) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [message, setMessage] = useState('Dang tai san pham...');

  async function loadProduct() {
    if (!getAdminToken()) {
      setMessage('Vui long dang nhap quan tri truoc.');
      return;
    }

    try {
      const [productPayload, categoriesPayload] = await Promise.all([
        adminFetch<ProductDetail>(`/admin/products/${encodeURIComponent(id)}`),
        adminFetch<{ data: Category[] }>('/categories')
      ]);

      setProduct(productPayload);
      setVariants(productPayload.variants?.length ? productPayload.variants : [emptyVariant()]);
      setImages(productPayload.images ?? []);
      setSelectedTags(
        productPayload.tags
          ?.map((tag) => tag.name)
          .filter((name) => !['order', 'resin'].includes(name.toLowerCase())) ?? []
      );
      setCategories(categoriesPayload.data);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong tai duoc san pham.');
    }
  }

  useEffect(() => {
    void loadProduct();
  }, [id]);

  async function submit(formData: FormData) {
    setMessage('Dang luu san pham...');

    try {
      const cleanVariants = variants
        .map((variant) => ({
          id: variant.id,
          sku: variant.sku?.trim() || null,
          name: variant.name.trim(),
          price: variant.price ? String(variant.price) : null,
          isActive: variant.isActive
          ,trackInventory: variant.trackInventory
          ,inventoryQuantity: Number(variant.inventoryQuantity) || 0
        }))
        .filter((variant) => variant.name);

      const cleanImages = images
        .map((image, index) => ({
          url: image.url.trim(),
          altText: image.altText?.trim() || String(formData.get('name') ?? ''),
          sortOrder: Number.isFinite(Number(image.sortOrder)) ? Number(image.sortOrder) : index
        }))
        .filter((image) => image.url);
      const availability = String(formData.get('availability') ?? 'PRE_ORDER');
      const systemTag = availability === 'ORDER' ? 'order' : 'resin';

      await adminFetch(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(formData.get('name') ?? ''),
          slug: String(formData.get('slug') ?? ''),
          studio: String(formData.get('studio') ?? '') || null,
          description: String(formData.get('description') ?? '') || null,
          categoryId: String(formData.get('categoryId') ?? '') || null,
          status: String(formData.get('status') ?? 'DRAFT'),
          availability,
          basePrice: String(formData.get('basePrice') ?? '') || null,
          compareAtPrice: String(formData.get('compareAtPrice') ?? '') || null,
          preorderOpenAt: toIsoDate(formData.get('preorderOpenAt')),
          preorderCloseAt: toIsoDate(formData.get('preorderCloseAt')),
          estimatedReadyAt: toIsoDate(formData.get('estimatedReadyAt')),
          paymentRequirement: String(formData.get('paymentRequirement') ?? 'FULL'),
          depositPercent: Number(formData.get('depositPercent') ?? 100),
          trackInventory: formData.get('trackInventory') === 'on',
          inventoryQuantity: Number(formData.get('inventoryQuantity') ?? 0),
          tags: [...selectedTags, systemTag],
          variants: cleanVariants,
          images: cleanImages
        })
      });

      await loadProduct();
      setMessage('Da luu san pham.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong luu duoc san pham.');
    }
  }

  async function archiveProduct() {
    if (!window.confirm(`Xóa vĩnh viễn sản phẩm “${product?.name ?? ''}”? Thao tác này không thể hoàn tác.`)) return;
    setMessage('Đang xóa vĩnh viễn sản phẩm...');

    try {
      await adminFetch(`/products/${id}`, { method: 'DELETE' });
      window.location.href = '/catalog';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không xóa được sản phẩm.');
    }
  }

  if (!product) {
    return <p className="admin-message">{message}</p>;
  }

  return (
    <div className="detail-stack">
      <section className="admin-panel">
        <h2>Thong tin san pham</h2>
        <form className="admin-form compact-form" action={submit}>
          <label>
            Ten san pham
            <input name="name" defaultValue={product.name} required />
          </label>
          <label>
            Slug
            <input name="slug" defaultValue={product.slug} required />
          </label>
          <label>
            Studio
            <input name="studio" defaultValue={product.studio ?? ''} />
          </label>
          <label>
            Danh muc
            <select name="categoryId" defaultValue={product.categoryId ?? ''}>
              <option value="">Chua gan danh muc</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trang thai
            <select name="status" defaultValue={product.status}>
              {productStatuses.map((status) => (
                <option value={status} key={status}>
                  {labelOf(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tinh trang ban
            <select name="availability" defaultValue={product.availability}>
              {availabilityOptions.map((status) => (
                <option value={status} key={status}>
                  {labelOf(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gia goc
            <input name="basePrice" defaultValue={product.basePrice ?? ''} />
          </label>
          <label>
            Gia so sanh
            <input name="compareAtPrice" defaultValue={product.compareAtPrice ?? ''} />
          </label>
          <label>
            Hinh thuc thanh toan
            <select name="paymentRequirement" defaultValue={product.paymentRequirement}>
              <option value="FULL">Thanh toan du</option>
              <option value="DEPOSIT">Dat coc</option>
            </select>
          </label>
          <label>
            Phan tram dat coc
            <input name="depositPercent" type="number" min="1" max="100" defaultValue={product.depositPercent} />
          </label>
          <label>
            Ton kho san pham
            <input name="inventoryQuantity" type="number" min="0" defaultValue={product.inventoryQuantity} />
          </label>
          <label className="inline-check">
            <input name="trackInventory" type="checkbox" defaultChecked={product.trackInventory} />
            Theo doi ton kho san pham
          </label>
          <label>
            Mo pre-order
            <input name="preorderOpenAt" type="datetime-local" defaultValue={toLocalDate(product.preorderOpenAt)} />
          </label>
          <label>
            Dong pre-order
            <input name="preorderCloseAt" type="datetime-local" defaultValue={toLocalDate(product.preorderCloseAt)} />
          </label>
          <label>
            Du kien san sang
            <input name="estimatedReadyAt" type="datetime-local" defaultValue={toLocalDate(product.estimatedReadyAt)} />
          </label>
          <div className="wide-field">
            <TagPicker selected={selectedTags} onChange={setSelectedTags} />
          </div>
          <label className="wide-field">
            Mo ta
            <textarea name="description" defaultValue={product.description ?? ''} />
          </label>

          <div className="wide-field editor-subsection">
            <div className="editor-subsection-heading">
              <h3>Variants</h3>
              <button type="button" className="secondary-button" onClick={() => setVariants((current) => [...current, emptyVariant()])}>
                Them variant
              </button>
            </div>
            {variants.map((variant, index) => (
              <div className="editor-grid-row" key={variant.id ?? index}>
                <input
                  aria-label="Ten variant"
                  value={variant.name}
                  placeholder="Ten variant"
                  onChange={(event) => setVariants((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))}
                />
                <input
                  aria-label="SKU"
                  value={variant.sku ?? ''}
                  placeholder="SKU"
                  onChange={(event) => setVariants((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, sku: event.target.value } : item)))}
                />
                <input
                  aria-label="Gia"
                  value={variant.price ?? ''}
                  placeholder="Gia"
                  onChange={(event) => setVariants((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, price: event.target.value } : item)))}
                />
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={variant.isActive}
                    onChange={(event) => setVariants((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, isActive: event.target.checked } : item)))}
                  />
                  Active
                </label>
                <input
                  aria-label="Ton kho variant"
                  type="number"
                  min="0"
                  value={variant.inventoryQuantity}
                  onChange={(event) => setVariants((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, inventoryQuantity: Number(event.target.value) } : item)))}
                />
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={variant.trackInventory}
                    onChange={(event) => setVariants((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, trackInventory: event.target.checked } : item)))}
                  />
                  Theo doi ton
                </label>
              </div>
            ))}
          </div>

          <div className="wide-field editor-subsection">
            <div className="editor-subsection-heading">
              <h3>Hình ảnh sản phẩm</h3>
            </div>
            <ProductImageUploader images={images} onChange={setImages} productName={product.name} />
          </div>

          <div className="row-actions wide-field">
            <button type="submit">Luu san pham</button>
            <button type="button" className="danger-button" onClick={() => void archiveProduct()}>
              Xóa sản phẩm
            </button>
            <a className="secondary-button" href="/catalog">
              Quay lai catalog
            </a>
          </div>
        </form>
      </section>
      {message ? <p className="admin-message">{message}</p> : null}
    </div>
  );
}

function toIsoDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();
  return raw ? new Date(raw).toISOString() : null;
}

function toLocalDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
