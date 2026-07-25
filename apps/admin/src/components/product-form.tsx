'use client';

import { useState } from 'react';
import { adminFetch } from '../lib/browser-api';
import { createProductSlug } from '../lib/product-slug';
import { ProductImageUploader, type UploadedProductImage } from './product-image-uploader';

function splitTags(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProductForm() {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<UploadedProductImage[]>([]);
  const [productName, setProductName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [productType, setProductType] = useState<'ORDER' | 'RESIN'>('ORDER');
  const [availability, setAvailability] = useState('ORDER');
  const [status, setStatus] = useState('ACTIVE');

  async function submit(formData: FormData) {
    setMessage('Đang tạo sản phẩm...');

    const manualTags = splitTags(formData.get('tags'));
    const systemTag = productType.toLowerCase();
    const tags = [...manualTags.filter((tag) => !['order', 'resin'].includes(tag.toLowerCase())), systemTag];

    try {
      await adminFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: String(formData.get('name') ?? ''),
          slug: String(formData.get('slug') ?? ''),
          studio: String(formData.get('studio') ?? '') || null,
          description: String(formData.get('description') ?? '') || null,
          availability: productType === 'ORDER' ? 'ORDER' : availability,
          status,
          basePrice: String(formData.get('basePrice') ?? ''),
          compareAtPrice: String(formData.get('compareAtPrice') ?? ''),
          tags,
          images: images.map((image, index) => ({
            url: image.url,
            altText: image.altText || String(formData.get('name') ?? ''),
            sortOrder: index
          }))
        })
      });
      window.dispatchEvent(new Event('admin:data-changed'));
      setMessage('Đã tạo sản phẩm.');
      window.location.href = '/catalog';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tạo được sản phẩm.');
    }
  }

  return (
    <form className="admin-form compact-form" action={submit}>
      <div className="wide-field product-type-picker">
        <div><strong>Loại sản phẩm</strong><span>Sản phẩm sẽ tự động xuất hiện trong trang tương ứng trên cửa hàng.</span></div>
        <div className="product-type-options" role="radiogroup" aria-label="Loại sản phẩm">
          <button type="button" role="radio" aria-checked={productType === 'ORDER'} className={productType === 'ORDER' ? 'is-selected' : ''} onClick={() => { setProductType('ORDER'); setAvailability('ORDER'); }}><b>Order</b><small>Figure và statue nhận đặt theo yêu cầu</small><i>Xuất hiện tại /order</i></button>
          <button type="button" role="radio" aria-checked={productType === 'RESIN'} className={productType === 'RESIN' ? 'is-selected' : ''} onClick={() => { setProductType('RESIN'); if (availability === 'ORDER') setAvailability('PRE_ORDER'); }}><b>Resin</b><small>Mô hình resin sưu tầm</small><i>Xuất hiện tại trang Resin</i></button>
        </div>
      </div>
      <label>
        Tên sản phẩm
        <input
          name="name"
          required
          value={productName}
          onChange={(event) => {
            const nextName = event.target.value;
            setProductName(nextName);
            if (!slugWasEdited) setSlug(createProductSlug(nextName));
          }}
        />
      </label>
      <label>
        Slug
        <input
          name="slug"
          required
          value={slug}
          onChange={(event) => {
            const nextSlug = event.target.value;
            setSlug(nextSlug);
            setSlugWasEdited(nextSlug !== createProductSlug(productName));
          }}
        />
        <small>Tự tạo theo tên sản phẩm; bạn vẫn có thể sửa lại.</small>
      </label>
      <label>
        Studio / thương hiệu
        <input name="studio" />
      </label>
      <label>
        Trạng thái
        <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="DRAFT">Bản nháp</option>
          <option value="ACTIVE">Đang bán</option>
        </select>
        <small className={status === 'ACTIVE' ? 'publish-hint is-live' : 'publish-hint'}>{status === 'ACTIVE' ? 'Sản phẩm sẽ xuất hiện trên website sau khi tạo.' : 'Bản nháp chỉ hiển thị trong admin, không xuất hiện trên website.'}</small>
      </label>
      <label>
        Tình trạng bán
        <select name="availability" value={productType === 'ORDER' ? 'ORDER' : availability} disabled={productType === 'ORDER'} onChange={(event) => setAvailability(event.target.value)}>
          <option value="PRE_ORDER">Đặt trước</option>
          <option value="ORDER">Đặt hàng</option>
          <option value="IN_STOCK">Có sẵn</option>
          <option value="SALE">Giảm giá</option>
          <option value="CONTACT">Liên hệ</option>
        </select>
      </label>
      <label>
        Giá gốc
        <input name="basePrice" placeholder="2450000" />
      </label>
      <label>
        {productType === 'ORDER' ? 'Giá cọc' : 'Giá so sánh'}
        <input name="compareAtPrice" placeholder="2990000" />
      </label>
      <label>
        Tag
        <input name="tags" placeholder="FURYU, Nendoroid, Pre-order" />
      </label>
      <label className="wide-field product-images-field">
        Hình ảnh sản phẩm
        <ProductImageUploader images={images} onChange={setImages} productName={productName || 'Sản phẩm mới'} />
      </label>
      <label className="wide-field">
        Mô tả
        <textarea name="description" />
      </label>
      <div className="row-actions wide-field">
        <button type="submit">Tạo sản phẩm</button>
        <a className="secondary-button" href="/catalog">
          Quay lại catalog
        </a>
      </div>
      {message ? <p className="wide-field">{message}</p> : null}
    </form>
  );
}
