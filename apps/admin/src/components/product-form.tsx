'use client';

import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '../lib/browser-api';
import { createProductSlug } from '../lib/product-slug';
import { ProductImageUploader, type UploadedProductImage } from './product-image-uploader';
import { TagPicker } from './tag-picker';

const DRAFT_KEY = 'admin:product-form-draft';

const RESIN_DEPOSIT_PERCENT = 20;

type ProductDraft = {
  productName: string;
  slug: string;
  slugWasEdited: boolean;
  productType: 'ORDER' | 'RESIN';
  availability: string;
  status: string;
  selectedTags: string[];
  images: UploadedProductImage[];
  studio?: string;
  description?: string;
  basePrice?: string;
  compareAtPrice?: string;
  savedAt: number;
};

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
  const [resinDeposit, setResinDeposit] = useState('');
  const [depositWasEdited, setDepositWasEdited] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft: ProductDraft = JSON.parse(saved);
        const age = Date.now() - draft.savedAt;

        // Only restore if draft is less than 24 hours old
        if (age < 24 * 60 * 60 * 1000) {
          setProductName(draft.productName || '');
          setSlug(draft.slug || '');
          setSlugWasEdited(draft.slugWasEdited || false);
          setProductType(draft.productType || 'ORDER');
          setAvailability(draft.availability || 'ORDER');
          setStatus(draft.status || 'ACTIVE');
          setSelectedTags(draft.selectedTags || []);
          setImages(draft.images || []);
          setResinDeposit(draft.compareAtPrice || '');

          // Restore form field values after a short delay to ensure form is rendered
          setTimeout(() => {
            if (formRef.current) {
              const form = formRef.current;
              if (draft.studio) {
                const studioInput = form.elements.namedItem('studio') as HTMLInputElement;
                if (studioInput) studioInput.value = draft.studio;
              }
              if (draft.description) {
                const descInput = form.elements.namedItem('description') as HTMLTextAreaElement;
                if (descInput) descInput.value = draft.description;
              }
              if (draft.basePrice) {
                const priceInput = form.elements.namedItem('basePrice') as HTMLInputElement;
                if (priceInput) priceInput.value = draft.basePrice;
              }
              if (draft.compareAtPrice) {
                const compareInput = form.elements.namedItem('compareAtPrice') as HTMLInputElement;
                if (compareInput) compareInput.value = draft.compareAtPrice;
              }
            }
          }, 100);

          setMessage('✓ Đã khôi phục bản nháp trước đó');
          setTimeout(() => setMessage(''), 3000);
        } else {
          // Draft too old, clear it
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!draftLoaded) return; // Don't save until initial load is complete

    const saveDraft = () => {
      if (!formRef.current) return;

      const form = formRef.current;
      const formData = new FormData(form);

      const draft: ProductDraft = {
        productName,
        slug,
        slugWasEdited,
        productType,
        availability,
        status,
        selectedTags,
        images,
        studio: String(formData.get('studio') ?? ''),
        description: String(formData.get('description') ?? ''),
        basePrice: String(formData.get('basePrice') ?? ''),
        compareAtPrice: String(formData.get('compareAtPrice') ?? ''),
        savedAt: Date.now()
      };

      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    };

    // Debounce save
    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [draftLoaded, productName, slug, slugWasEdited, productType, availability, status, selectedTags, images]);

  async function submit(formData: FormData) {
    setMessage('Đang tạo sản phẩm...');

    const systemTag = productType.toLowerCase();
    const tags = [...selectedTags, systemTag];
    const resinDepositValue = String(resinDeposit ?? '').trim();
    const resinHasDeposit = productType === 'RESIN' && Boolean(resinDepositValue && Number(resinDepositValue) > 0);

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
          compareAtPrice: productType === 'ORDER'
            ? String(formData.get('compareAtPrice') ?? '') || null
            : resinDepositValue || null,
          paymentRequirement: resinHasDeposit ? 'DEPOSIT' : undefined,
          depositPercent: resinHasDeposit ? RESIN_DEPOSIT_PERCENT : undefined,
          tags,
          images: images.map((image, index) => ({
            url: image.url,
            altText: image.altText || String(formData.get('name') ?? ''),
            sortOrder: index
          }))
        })
      });

      // Clear draft after successful submission
      localStorage.removeItem(DRAFT_KEY);

      window.dispatchEvent(new Event('admin:data-changed'));
      setMessage('Đã tạo sản phẩm.');
      window.location.href = '/catalog';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tạo được sản phẩm.');
    }
  }

  function clearDraft() {
    if (confirm('Xóa toàn bộ dữ liệu đang nhập?')) {
      localStorage.removeItem(DRAFT_KEY);
      window.location.reload();
    }
  }

  return (
    <form ref={formRef} className="admin-form product-create-form" action={submit}>
      <div className="wide-field product-type-picker">
        <div>
          <strong>Loại sản phẩm</strong>
          <span>Sản phẩm sẽ tự động xuất hiện trong trang tương ứng trên cửa hàng.</span>
        </div>
        <div className="product-type-options" role="radiogroup" aria-label="Loại sản phẩm">
          <button
            type="button"
            role="radio"
            aria-checked={productType === 'ORDER'}
            className={productType === 'ORDER' ? 'is-selected' : ''}
            onClick={() => { setProductType('ORDER'); setAvailability('ORDER'); }}
          >
            <b>Order</b>
            <small>Figure và statue nhận đặt theo yêu cầu</small>
            <i>Xuất hiện tại /order</i>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={productType === 'RESIN'}
            className={productType === 'RESIN' ? 'is-selected' : ''}
            onClick={() => {
              setProductType('RESIN');
              setAvailability('PRE_ORDER');
              if (!depositWasEdited) {
                const basePriceInput = formRef.current?.elements.namedItem('basePrice') as HTMLInputElement | null;
                const base = basePriceInput ? Number(basePriceInput.value.replace(/[^\d]/g, '')) : 0;
                setResinDeposit(base > 0 ? String(Math.round(base * RESIN_DEPOSIT_PERCENT / 100)) : '');
              }
            }}
          >
            <b>Resin</b>
            <small>Mô hình resin sưu tầm</small>
            <i>Xuất hiện tại trang Resin</i>
          </button>
        </div>
      </div>
      <div className="wide-field product-create-columns">
        <section className="product-form-section">
          <div className="product-form-section-heading">
            <span>01</span>
            <div>
              <strong>Thông tin cơ bản</strong>
              <small>Tên, đường dẫn và nội dung giới thiệu sản phẩm.</small>
            </div>
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
            {productType === 'ORDER' && (
              <label className="wide-field">
                Studio / thương hiệu
                <input name="studio" placeholder="VD: Bandai, Good Smile Company..." />
              </label>
            )}
            <label className="wide-field">
              Mô tả
              <textarea
                name="description"
                placeholder="Thông tin nổi bật, kích thước, chất liệu..."
                rows={4}
              />
            </label>
          </div>
        </section>

        <section className="product-form-section">
          <div className="product-form-section-heading">
            <span>02</span>
            <div>
              <strong>Bán hàng</strong>
              <small>Thiết lập trạng thái, tình trạng và giá bán.</small>
            </div>
          </div>
          <div className="product-field-grid">
            <label>
              Trạng thái
              <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="DRAFT">Bản nháp</option>
                <option value="ACTIVE">Đang bán</option>
              </select>
              <small className={status === 'ACTIVE' ? 'publish-hint is-live' : 'publish-hint'}>
                {status === 'ACTIVE'
                  ? 'Sản phẩm sẽ xuất hiện trên website sau khi tạo.'
                  : 'Bản nháp chỉ hiển thị trong admin, không xuất hiện trên website.'}
              </small>
            </label>
            <label>
              Tình trạng bán
              <select
                name="availability"
                value={productType === 'ORDER' ? 'ORDER' : availability}
                disabled={productType === 'ORDER'}
                onChange={(event) => setAvailability(event.target.value)}
              >
                {productType === 'ORDER' ? (
                  <option value="ORDER">Đặt hàng</option>
                ) : (
                  <>
                    <option value="PRE_ORDER">Đặt in</option>
                    <option value="IN_STOCK">Có sẵn</option>
                  </>
                )}
              </select>
              {productType === 'RESIN' && (
                <small>Chọn "Đặt in" nếu nhận sản xuất theo yêu cầu, hoặc "Có sẵn" nếu hàng đã sẵn sàng giao.</small>
              )}
            </label>
            <label>
              Giá gốc
              <input
                name="basePrice"
                type="text"
                inputMode="numeric"
                placeholder="2450000"
                required
                onChange={(event) => {
                  if (productType === 'RESIN' && !depositWasEdited) {
                    const base = Number(event.target.value.replace(/[^\d]/g, ''));
                    setResinDeposit(base > 0 ? String(Math.round(base * RESIN_DEPOSIT_PERCENT / 100)) : '');
                  }
                }}
              />
            </label>
            {productType === 'ORDER' && (
              <label>
                Giá cọc
                <input
                  name="compareAtPrice"
                  type="text"
                  inputMode="numeric"
                  placeholder="500000"
                />
              </label>
            )}
            {productType === 'RESIN' && (
              <label>
                Giá cọc
                <input
                  name="compareAtPrice"
                  type="text"
                  inputMode="numeric"
                  value={resinDeposit}
                  onChange={(event) => {
                    setDepositWasEdited(true);
                    setResinDeposit(event.target.value);
                  }}
                  placeholder="Tự tính 20% giá gốc"
                />
                <small>Mặc định tự tính 20% giá gốc, bạn có thể chỉnh sửa.</small>
              </label>
            )}
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
        <button type="button" className="secondary-button" onClick={clearDraft} title="Xóa bản nháp">
          Xóa nháp
        </button>
      </div>

      {message && <p className="wide-field admin-message">{message}</p>}
    </form>
  );
}
