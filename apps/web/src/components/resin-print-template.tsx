'use client';

import { useState } from 'react';
import { AddToCartButton } from './add-to-cart-button';

type ResinPrintTemplateProps = {
  productId: string;
  productName: string;
  price: string;
  imageUrl?: string;
  imageTone: string;
  category: string;
};

const materialOptions = ['Resin tiêu chuẩn', 'Resin chi tiết cao', 'Resin dẻo / chống gãy', 'Resin trong suốt', 'Cần shop tư vấn'];
const colorOptions = ['Xám', 'Trắng', 'Đen', 'Trong suốt', 'Theo yêu cầu'];

export function ResinPrintTemplate({ productId, productName, price, imageUrl, imageTone, category }: ResinPrintTemplateProps) {
  const [modelName, setModelName] = useState('');
  const [scale, setScale] = useState('');
  const [size, setSize] = useState('');
  const [material, setMaterial] = useState(materialOptions[0]);
  const [color, setColor] = useState(colorOptions[0]);
  const [note, setNote] = useState('');
  const [fileName, setFileName] = useState('');

  function saveDraft() {
    const payload = {
      productId,
      productName,
      modelName,
      scale,
      size,
      material,
      color,
      note,
      fileName,
      savedAt: new Date().toISOString()
    };

    window.localStorage.setItem(`hanbotorder-resin-note:${productId}`, JSON.stringify(payload));
  }

  return (
    <section className="resin-template" aria-label="Đặt in resin">
      <form className="resin-note-board">
        <div className="resin-note-heading">
          <p>Dịch vụ in resin</p>
          <h1>Gửi yêu cầu in mô hình</h1>
          <span>Shop sẽ kiểm file và báo giá chi tiết trước khi xác nhận.</span>
        </div>

        <label className="resin-field">
          <span>Tên mô hình</span>
          <input value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="Ví dụ: Stitch sitting model" />
        </label>

        <div className="resin-field-row">
          <label className="resin-field">
            <span>Scale</span>
            <input value={scale} onChange={(event) => setScale(event.target.value)} placeholder="Ví dụ: 1/6, 1/8, chibi" />
          </label>

          <label className="resin-field">
            <span>Kích thước</span>
            <input value={size} onChange={(event) => setSize(event.target.value)} placeholder="Ví dụ: cao 15cm" />
          </label>
        </div>

        <div className="resin-field-row">
          <label className="resin-field">
            <span>Chất liệu resin</span>
            <select value={material} onChange={(event) => setMaterial(event.target.value)}>
              {materialOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="resin-field">
            <span>Màu sắc</span>
            <select value={color} onChange={(event) => setColor(event.target.value)}>
              {colorOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="resin-field">
          <span>Ghi chú chi tiết</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={9}
            placeholder="Nhập yêu cầu về độ chi tiết, chia part, xử lý support, số lượng, deadline, hậu kỳ sau in hoặc các lưu ý khi in..."
          />
        </label>

        <label className="resin-upload-field">
          <span>Upload file STL/OBJ nếu có</span>
          <input
            type="file"
            accept=".stl,.obj,.zip,.rar,.7z"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
          />
          <strong>{fileName || 'Chọn file STL, OBJ hoặc file nén'}</strong>
          <small>File sẽ được gửi trong bước xử lý đơn. Nếu file quá lớn, bạn có thể ghi chú link cloud ở ô bên trên.</small>
        </label>
      </form>

      <aside className="resin-order-panel" aria-label="Thông tin dịch vụ in resin">
        <div className={`resin-product-preview product-image--${imageTone}`}>
          {imageUrl ? <img src={imageUrl} alt={productName} /> : <span>{category}</span>}
        </div>

        <div className="resin-order-copy">
          <p>Resin print service</p>
          <h2>{productName}</h2>
          <span className="resin-price">{price}</span>
        </div>

        <div className="resin-service-list">
          <span>Kiểm tra file trước khi in</span>
          <span>Tư vấn scale, chia part và support</span>
          <span>Báo giá theo kích thước và chất liệu</span>
        </div>

        <div className="resin-order-cta">
          <AddToCartButton productId={productId} label="Đặt in" onSuccess={saveDraft} />
          <button type="button" aria-label="Tùy chọn đặt in">
            ˅
          </button>
        </div>

        <p className="resin-order-note">
          Sau khi đặt in, shop sẽ liên hệ lại để xác nhận file, giá cuối cùng và thời gian hoàn thiện.
        </p>
      </aside>
    </section>
  );
}
