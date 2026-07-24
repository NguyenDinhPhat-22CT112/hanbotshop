'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { labelOf } from '../lib/labels';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  studio: string | null;
  description: string | null;
  status: string;
  availability: string;
  basePrice: string | null;
  compareAtPrice: string | null;
  images?: Array<{ id: string; url: string }>;
  tags?: Array<{ id: string; name: string; slug: string }>;
};

type ProductResponse = {
  data: ProductRow[];
};

function formatPrice(value: string | null) {
  if (!value) {
    return 'Liên hệ shop';
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  return `${new Intl.NumberFormat('vi-VN').format(numericValue)} VND`;
}

function splitTags(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CatalogTable() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('Đang tải sản phẩm...');

  async function loadProducts() {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const payload = await adminFetch<ProductResponse>('/admin/products?pageSize=100');
      setProducts(payload.data);
      setMessage(payload.data.length ? '' : 'Chưa có sản phẩm.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được sản phẩm.');
    }
  }

  useEffect(() => {
    void loadProducts();
    window.addEventListener('admin:data-changed', loadProducts);

    return () => window.removeEventListener('admin:data-changed', loadProducts);
  }, []);

  async function updateProduct(product: ProductRow, formData: FormData) {
    setMessage('Đang cập nhật sản phẩm...');

    const imageUrls = splitLines(formData.get('imageUrls'));

    try {
      await adminFetch(`/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(formData.get('name') ?? ''),
          slug: String(formData.get('slug') ?? ''),
          studio: String(formData.get('studio') ?? '') || null,
          description: String(formData.get('description') ?? '') || null,
          status: String(formData.get('status') ?? 'ACTIVE'),
          availability: String(formData.get('availability') ?? 'PRE_ORDER'),
          basePrice: String(formData.get('basePrice') ?? ''),
          compareAtPrice: String(formData.get('compareAtPrice') ?? ''),
          tags: splitTags(formData.get('tags')),
          images: imageUrls.map((url, index) => ({
            url,
            altText: String(formData.get('name') ?? product.name),
            sortOrder: index
          }))
        })
      });
      setEditingId(null);
      await loadProducts();
      setMessage('Đã cập nhật sản phẩm.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được sản phẩm.');
    }
  }

  async function archiveProduct(productId: string) {
    setMessage('Đang lưu trữ sản phẩm...');

    try {
      await adminFetch(`/products/${productId}`, { method: 'DELETE' });
      await loadProducts();
      setMessage('Đã lưu trữ sản phẩm.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không lưu trữ được sản phẩm.');
    }
  }

  return (
    <section className="table-panel">
      <div className="table-row catalog-row table-head">
        <span>Sản phẩm</span>
        <span>Trạng thái</span>
        <span>Tình trạng bán</span>
        <span>Tag</span>
        <span>Ảnh</span>
        <span>Giá</span>
        <span>Thao tác</span>
      </div>
      {products.length ? (
        products.map((row) =>
          editingId === row.id ? (
            <form className="table-row catalog-edit-row" action={(formData) => void updateProduct(row, formData)} key={row.id}>
              <label>
                Tên
                <input name="name" defaultValue={row.name} required />
              </label>
              <label>
                Slug
                <input name="slug" defaultValue={row.slug} required />
              </label>
              <label>
                Studio
                <input name="studio" defaultValue={row.studio ?? ''} />
              </label>
              <label>
                Trạng thái
                <select name="status" defaultValue={row.status}>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="ACTIVE">Đang bán</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </label>
              <label>
                Tình trạng
                <select name="availability" defaultValue={row.availability}>
                  <option value="PRE_ORDER">Đặt trước</option>
                  <option value="ORDER">Đặt hàng</option>
                  <option value="IN_STOCK">Có sẵn</option>
                  <option value="SALE">Giảm giá</option>
                  <option value="CONTACT">Liên hệ</option>
                </select>
              </label>
              <label>
                Giá
                <input name="basePrice" defaultValue={row.basePrice ?? ''} />
              </label>
              <label>
                Giá so sánh
                <input name="compareAtPrice" defaultValue={row.compareAtPrice ?? ''} />
              </label>
              <label>
                Tag
                <input name="tags" defaultValue={row.tags?.map((tag) => tag.name).join(', ') ?? ''} />
              </label>
              <label>
                URL ảnh
                <textarea name="imageUrls" defaultValue={row.images?.map((image) => image.url).join('\n') ?? ''} />
              </label>
              <label className="wide-field">
                Mô tả
                <textarea name="description" defaultValue={row.description ?? ''} />
              </label>
              <div className="row-actions wide-field">
                <button type="submit">Lưu</button>
                <button type="button" className="secondary-button" onClick={() => setEditingId(null)}>
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <div className="table-row catalog-row" key={row.id}>
              <strong>
                {row.name}
                <small>{row.slug}</small>
              </strong>
              <span>{labelOf(row.status)}</span>
              <span>{labelOf(row.availability)}</span>
              <span>{row.tags?.length ? row.tags.map((tag) => tag.name).join(', ') : 'Chưa có'}</span>
              <span>{row.images?.length ?? 0} ảnh</span>
              <span>{formatPrice(row.basePrice)}</span>
              <span className="row-actions">
                <a className="secondary-button" href={`/catalog/${encodeURIComponent(row.id)}/edit`}>
                  Chi tiết
                </a>
                <button type="button" className="secondary-button" onClick={() => setEditingId(row.id)}>
                  Sửa
                </button>
                <button type="button" className="danger-button" disabled={row.status === 'ARCHIVED'} onClick={() => void archiveProduct(row.id)}>
                  Lưu trữ
                </button>
              </span>
            </div>
          )
        )
      ) : (
        <div className="table-row catalog-row">
          <span>{message}</span>
        </div>
      )}
      {message ? <p className="admin-message table-message">{message}</p> : null}
    </section>
  );
}
