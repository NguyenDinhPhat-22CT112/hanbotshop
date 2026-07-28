'use client';

import { useState } from 'react';
import { adminFetch } from '../lib/browser-api';
import { createProductSlug } from '../lib/product-slug';
import { ProductImageUploader, type UploadedProductImage } from './product-image-uploader';
import { TagPicker } from './tag-picker';

export function ProductForm() {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<UploadedProductImage[]>([]);
  const [productName, setProductName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [productType, setProductType] = useState<'ORDER' | 'RESIN'>('ORDER');
  const [availability, setAvailability] = useState('ORDER');
  const [status, setStatus] = useState('ACTIVE');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  async function submit(formData: FormData) {
    setMessage('Đang tạo sản phẩm...');

    const systemTag = productType.toLowerCase();
    const tags = [...selectedTags, systemTag];

    try {
      await adminFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: String(formData.get('name') ?? ''),
          slug: String(formData.get('slug') ?? ''),
          studio: productType === 'ORDER' ? String(formData.get('studio') ?? '') || null : null,
          description: String(formData.get('description') ?? '') || null,
          availability: productType === 'ORDER' ? 'ORDER' : availability,
          status,
          basePrice: String(formData.get('basePrice') ?? ''),
          compareAtPrice: productType === 'ORDER' ? String(formData.get('compareAtPrice') ?? '') || null : null,
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
    <form className="admin-form product-create-form" action={submit}>
      <div className="wide-field product-type-picker">
        <div><strong>Loại sản phẩm</strong><span>Sản phẩm sẽ tự động xuất hiện trong trang tương ứng trên cửa hàng.</span></div>
        <div className="product-type-options" role="radiogroup" aria-label="Loại sản phẩm">
          <button type="button" role="radio" aria-checked={productType === 'ORDER'} className={productType === 'ORDER' ? 'is-selected' : ''} onClick={() => { setProductType('ORDER'); setAvailability('ORDER'); }}><b>Order</b><small>Figure và statue nhận đặt theo yêu cầu</small><i>Xuất hiện tại /order</i></button>
          <button type="button" role="radio" aria-checked={productType === 'RESIN'} className={productType === 'RESIN' ? 'is-selected' : ''} onClick={() => { setProductType('RESIN'); setAvailability('PRE_ORDER'); }}><b>Resin</b><small>Mô hình resin sưu tầm</small><i>Xuất hiện tại trang Resin</i></button>
        </div>
      </div>
      <div className="wide-field product-create-columns">
        <section className="product-form-section">
          <div className="product-form-section-heading">
            <span>01</span>
            <div><strong>Thông tin cơ bản</strong><small>Tên, đường dẫn và nội dung giới thiệu sản phẩm.</small></div>
          </div>
          <div className="product-field-grid">
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
            {productType === 'ORDER' ? (
              <label className="wide-field">
                Studio / thương hiệu
                <input name="studio" />
              </label>
            ) : null}
            <label className="wide-field">
              Mô tả
              <textarea name="description" placeholder="Thông tin nổi bật, kích thước, chất liệu..." />
            </label>
          </div>
        </section>

        <section className="product-form-section">
          <div className="product-form-section-heading">
            <span>02</span>
            <div><strong>Bán hàng</strong><small>Thiết lập trạng thái, tình trạng và giá bán.</small></div>
          </div>
          <div className="product-field-grid">
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
                {productType === 'ORDER' ? (
                  <option value="ORDER">Đặt hàng</option>
                ) : (
                  <>
                    <option value="PRE_ORDER">Đặt in</option>
                    <option value="IN_STOCK">Có sẵn</option>
                  </>
                )}
              </select>
              {productType === 'RESIN' ? <small>Chọn “Đặt in” nếu nhận sản xuất theo yêu cầu, hoặc “Có sẵn” nếu hàng đã sẵn sàng giao.</small> : null}
            </label>
            <label>
              Giá gốc
              <input name="basePrice" inputMode="numeric" placeholder="2450000" />
            </label>
            {productType === 'ORDER' ? (
              <label>
                Giá cọc
                <input name="compareAtPrice" inputMode="numeric" placeholder="2990000" />
              </label>
            ) : null}
          </div>
        </section>
      </div>

      <div className="wide-field">
        <TagPicker selected={selectedTags} onChange={setSelectedTags} />
      </div>
      <label className="wide-field product-images-field">
        Hình ảnh sản phẩm
        <ProductImageUploader images={images} onChange={setImages} productName={productName || 'Sản phẩm mới'} />
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
