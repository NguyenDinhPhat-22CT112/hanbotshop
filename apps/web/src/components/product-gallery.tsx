'use client';

import { useState } from 'react';

type ProductGalleryProps = {
  productName: string;
  category: string;
  imageTone: string;
  images: string[];
};

export function ProductGallery({ productName, category, imageTone, images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [shareMessage, setShareMessage] = useState('');
  const activeImage = images[activeIndex];

  function showNext() {
    if (images.length > 1) setActiveIndex((current) => (current + 1) % images.length);
  }

  async function share() {
    const shareData = { title: productName, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareMessage('Đã sao chép liên kết.');
      }
    } catch {
      setShareMessage('Chưa thể chia sẻ liên kết.');
    }
  }

  return (
    <div className="product-gallery-layout">
      {images.length > 1 ? (
        <div className="product-thumbnails" aria-label="Chọn ảnh sản phẩm">
          {images.map((image, index) => (
            <button
              className={`product-thumb product-image--${imageTone}${index === activeIndex ? ' active' : ''}`}
              type="button"
              key={`${image}-${index}`}
              aria-label={`Xem ảnh ${index + 1} của ${productName}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            >
              <img src={image} alt="" />
            </button>
          ))}
        </div>
      ) : null}

      <div className={`product-main-image product-image--${imageTone}`}>
        <button className="gallery-share" type="button" aria-label={`Chia sẻ ${productName}`} onClick={() => void share()}>
          ⛓
        </button>
        {images.length > 1 ? (
          <button className="gallery-next" type="button" aria-label="Xem ảnh tiếp theo" onClick={showNext}>›</button>
        ) : null}
        {activeImage ? <img src={activeImage} alt={`${productName} - ảnh ${activeIndex + 1}`} /> : <span>{category}</span>}
        {images.length > 1 ? (
          <div className="gallery-dots" aria-label={`Ảnh ${activeIndex + 1} trên ${images.length}`}>
            {images.map((image, index) => <i className={index === activeIndex ? 'active' : ''} key={`${image}-dot-${index}`} />)}
          </div>
        ) : null}
        {shareMessage ? <p className="gallery-share-message" role="status" aria-live="polite">{shareMessage}</p> : null}
      </div>
    </div>
  );
}
