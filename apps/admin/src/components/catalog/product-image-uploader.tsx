'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { adminFetch } from '../../lib/browser-api';

export type UploadedProductImage = {
  id?: string;
  url: string;
  altText?: string | null;
  sortOrder?: number | null;
};

type UploadIntent = {
  file: { id: string; url: string | null; storageProvider: string; storageKey: string };
  upload: { method: string; url: string; headers: Record<string, string> };
};

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const acceptedImageTypes = 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';
const maxProductImages = 20;
const maxImageSizeBytes = 10 * 1024 * 1024;

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.type === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (file.type === 'image/gif') {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    return signature === 'GIF87a' || signature === 'GIF89a';
  }

  if (file.type === 'image/webp') {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    );
  }

  return false;
}

export function ProductImageUploader({
  images,
  onChange,
  productName = 'sản phẩm'
}: {
  images: UploadedProductImage[];
  onChange: (images: UploadedProductImage[]) => void;
  productName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const atLimit = images.length >= maxProductImages;

  function reorderImages(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= images.length ||
      toIndex >= images.length
    ) {
      return;
    }

    const reordered = [...images];
    const [movedImage] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedImage);
    onChange(reordered.map((image, index) => ({ ...image, sortOrder: index })));
    setMessage(`Đã chuyển ảnh sang vị trí ${toIndex + 1}.`);
  }

  async function upload(files: File[]) {
    if (!files.length) {
      setMessage('Vui lòng chọn ít nhất một ảnh.');
      return;
    }

    const invalidFiles = files.filter((file) => !allowedImageTypes.has(file.type.toLowerCase()));

    if (invalidFiles.length) {
      setMessage(
        `Chỉ chấp nhận JPG, PNG, WebP hoặc GIF. Tệp không hợp lệ: ${invalidFiles.map((file) => file.name).join(', ')}`
      );
      return;
    }

    const oversizedFiles = files.filter((file) => file.size > maxImageSizeBytes);

    if (oversizedFiles.length) {
      setMessage(
        `Mỗi ảnh phải nhỏ hơn hoặc bằng 10 MB. Ảnh quá lớn: ${oversizedFiles.map((file) => file.name).join(', ')}`
      );
      return;
    }

    const signatureChecks = await Promise.all(
      files.map(async (file) => ({ file, valid: await hasValidImageSignature(file) }))
    );
    const invalidContents = signatureChecks.filter(({ valid }) => !valid).map(({ file }) => file);

    if (invalidContents.length) {
      setMessage(
        `Nội dung tệp không phải ảnh hợp lệ: ${invalidContents.map((file) => file.name).join(', ')}`
      );
      return;
    }

    const availableSlots = maxProductImages - images.length;

    if (files.length > availableSlots) {
      setMessage(`Sản phẩm chỉ được có tối đa ${maxProductImages} ảnh. Bạn còn có thể thêm ${availableSlots} ảnh.`);
      return;
    }

    setUploading(true);
    setMessage(`Đang tải ${files.length} ảnh lên Cloudflare R2...`);
    const next = [...images];

    try {
      for (const file of files) {
        const intent = await adminFetch<UploadIntent>('/files/upload-intent', {
          method: 'POST',
          body: JSON.stringify({
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            isPublic: true
          })
        });
        const response = await fetch(intent.upload.url, {
          method: intent.upload.method || 'PUT',
          headers: intent.upload.headers,
          body: file
        });

        if (!response.ok) {
          throw new Error(`Không tải được ${file.name} (${response.status}).`);
        }

        const confirmed = await adminFetch<{ url: string | null }>(`/files/${intent.file.id}/confirm`, {
          method: 'PATCH'
        });
        const url = confirmed.url ?? intent.file.url;

        if (!url) {
          throw new Error(`Không tạo được URL công khai cho ${file.name}.`);
        }

        next.push({ url, altText: productName, sortOrder: next.length });
      }

      onChange(next);
      setMessage(`Đã tải ${files.length} ảnh lên R2.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được ảnh.');
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    void upload(Array.from(event.target.files ?? []));
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void upload(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="product-image-manager">
      <div
        className={`image-dropzone${dragging ? ' is-dragging' : ''}${uploading ? ' is-uploading' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        onClick={(event) => {
          if (event.target === inputRef.current) return;
          if (!uploading && !atLimit) inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !uploading && !atLimit) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedImageTypes}
          multiple
          hidden
          disabled={uploading || atLimit}
          onChange={select}
        />
        <span className="dropzone-icon">⇧</span>
        <strong>
          {uploading ? 'Đang tải ảnh...' : atLimit ? 'Đã đạt giới hạn 20 ảnh' : 'Kéo và thả ảnh vào đây'}
        </strong>
        <small>Tối đa 20 ảnh · 10 MB/ảnh · JPG, PNG, WebP, GIF</small>
        <button type="button" className="secondary-button" disabled={uploading || atLimit}>
          Chọn ảnh từ máy
        </button>
      </div>
      <div className="storage-note">
        <span>☁</span>
        <div>
          <strong>Nơi lưu: Cloudflare R2</strong>
          <small>Bucket hanbotorder · uploads/tài-khoản-admin/…</small>
        </div>
      </div>
      {images.length ? (
        <div className="uploaded-image-grid">
          {images.map((image, index) => (
            <article
              className={`${draggedImageIndex === index ? 'is-reordering' : ''}${dropTargetIndex === index ? ' is-drop-target' : ''}`}
              key={image.id ?? image.url}
              onDragOver={(event) => {
                if (draggedImageIndex === null) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTargetIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromIndex = draggedImageIndex ?? Number(event.dataTransfer.getData('text/plain'));
                reorderImages(fromIndex, index);
                setDraggedImageIndex(null);
                setDropTargetIndex(null);
              }}
            >
              <img src={image.url} alt={image.altText || productName} />
              <div>
                <input
                  aria-label={`Mô tả ảnh ${index + 1}`}
                  value={image.altText ?? ''}
                  placeholder="Mô tả ảnh"
                  onChange={(event) =>
                    onChange(
                      images.map((item, imageIndex) =>
                        imageIndex === index ? { ...item, altText: event.target.value } : item
                      )
                    )
                  }
                />
                <small>
                  Ảnh {index + 1}
                  {index === 0 ? ' · Ảnh đại diện' : ''}
                </small>
                <span className="image-order-controls">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Đưa ảnh ${index + 1} sang trước`}
                    onClick={() => reorderImages(index, index - 1)}
                  >
                    ← Trước
                  </button>
                  <button
                    type="button"
                    disabled={index === images.length - 1}
                    aria-label={`Đưa ảnh ${index + 1} sang sau`}
                    onClick={() => reorderImages(index, index + 1)}
                  >
                    Sau →
                  </button>
                </span>
              </div>
              <button
                type="button"
                className="image-delete-button"
                aria-label={`Xóa ảnh ${index + 1}`}
                onClick={() =>
                  onChange(
                    images
                      .filter((_, imageIndex) => imageIndex !== index)
                      .map((item, imageIndex) => ({ ...item, sortOrder: imageIndex }))
                  )
                }
              >
                ×
              </button>
              <button
                type="button"
                className="image-drag-handle"
                draggable
                aria-label={`Kéo để đổi vị trí ảnh ${index + 1}`}
                title="Kéo để sắp xếp ảnh"
                onDragStart={(event) => {
                  setDraggedImageIndex(index);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(index));
                }}
                onDragEnd={() => {
                  setDraggedImageIndex(null);
                  setDropTargetIndex(null);
                }}
              >
                ⠿
              </button>
            </article>
          ))}
        </div>
      ) : null}
      {message ? (
        <p className="image-upload-message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
