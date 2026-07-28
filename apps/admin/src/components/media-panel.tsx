'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { formatDateTime } from './admin-format';

type MediaFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string | null;
  storageKey: string;
  uploadStatus: string;
  isPublic: boolean;
  createdAt: string;
};

type UploadIntent = {
  file: MediaFile;
  upload: {
    method: string;
    url: string;
    headers: Record<string, string>;
    expiresInSeconds: number;
  };
};

function formatSize(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaPanel() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [intent, setIntent] = useState<UploadIntent | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [message, setMessage] = useState('Dang tai media...');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadFiles() {
    if (!getAdminToken()) {
      setMessage('Vui long dang nhap quan tri truoc.');
      return;
    }

    try {
      const payload = await adminFetch<{ data: MediaFile[] }>('/files');
      setFiles(payload.data);
      setMessage(payload.data.length ? '' : 'Chua co file.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong tai duoc media.');
    }
  }

  useEffect(() => {
    void loadFiles();
  }, []);

  async function createIntent(formData: FormData) {
    const selectedFile = formData.get('file');
    if (!(selectedFile instanceof File) || !selectedFile.size) {
      setMessage('Vui lòng chọn một tệp để tải lên.');
      return;
    }
    setUploading(true);
    setMessage('Đang tải tệp lên...');

    try {
      const payload = await adminFetch<UploadIntent>('/files/upload-intent', {
        method: 'POST',
        body: JSON.stringify({
          originalName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          size: selectedFile.size,
          isPublic: formData.get('isPublic') === 'on'
        })
      });
      setIntent(payload);
      const uploadResponse = await fetch(payload.upload.url, {
        method: payload.upload.method || 'PUT',
        headers: payload.upload.headers,
        body: selectedFile
      });
      if (!uploadResponse.ok) throw new Error(`Không tải được tệp lên kho lưu trữ (${uploadResponse.status}).`);
      await adminFetch(`/files/${payload.file.id}/confirm`, { method: 'PATCH' });
      await loadFiles();
      setMessage(`Đã tải lên “${selectedFile.name}” thành công.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được tệp.');
    } finally {
      setUploading(false);
    }
  }

  async function confirmFile(id: string) {
    setMessage('Dang confirm upload...');

    try {
      await adminFetch(`/files/${id}/confirm`, { method: 'PATCH' });
      await loadFiles();
      setMessage('Da confirm upload.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong confirm duoc upload.');
    }
  }

  async function getFile(formData: FormData) {
    const id = String(formData.get('fileId') ?? '').trim();

    if (!id) {
      return;
    }

    setMessage('Dang lay file...');

    try {
      const file = await adminFetch<MediaFile>(`/files/${id}`);
      setLookupId(file.id);
      setIntent(null);
      setFiles((current) => [file, ...current.filter((item) => item.id !== file.id)]);
      setMessage('Da lay file.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong lay duoc file.');
    }
  }

  async function deleteFile(file: MediaFile) {
    const confirmed = window.confirm(
      `Xóa vĩnh viễn “${file.originalName}”?\n\nTệp sẽ bị xóa khỏi Cloudflare R2 và thư viện. Thao tác này không thể hoàn tác.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(file.id);
    setMessage(`Đang xóa “${file.originalName}”...`);

    try {
      await adminFetch(`/files/${file.id}`, { method: 'DELETE' });
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setMessage(`Đã xóa “${file.originalName}” khỏi thư viện và Cloudflare R2.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không xóa được tệp. Tệp có thể đang được sử dụng.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="detail-stack">
      <section className="detail-two-column">
        <section className="admin-panel">
          <h2>Tải tệp mới</h2>
          <form className="admin-form" action={createIntent}>
            <label>
              Chọn tệp từ máy tính
              <input name="file" type="file" accept="image/*,video/*,.pdf" required />
            </label>
            <label className="inline-check">
              <input name="isPublic" type="checkbox" defaultChecked />
              Cho phép truy cập công khai
            </label>
            <button type="submit" disabled={uploading}>{uploading ? 'Đang tải lên...' : 'Tải tệp lên'}</button>
          </form>
        </section>

        <section className="admin-panel">
          <h2>Tra cứu tệp</h2>
          <form className="admin-form" action={getFile}>
            <label>
              Mã tệp
              <input name="fileId" value={lookupId} onChange={(event) => setLookupId(event.target.value)} />
            </label>
            <button type="submit">Tra cứu</button>
          </form>
          {intent ? (
            <div className="intent-box">
              <strong>{intent.file.id}</strong>
              <span>Tệp tải lên gần nhất</span>
            </div>
          ) : null}
        </section>
      </section>

      <section className="table-panel">
        <div className="table-row media-row table-head">
          <span>Tệp</span><span>Định dạng</span><span>Dung lượng</span><span>Trạng thái</span><span>Ngày tạo</span><span>Hành động</span>
        </div>
        {files.map((file) => (
          <div className="table-row media-row" key={file.id}>
            <strong>
              {file.originalName}
              <small>{file.id}</small>
            </strong>
            <span>{file.mimeType}</span>
            <span>{formatSize(file.size)}</span>
            <span><i className={`status-chip status-${file.uploadStatus.toLowerCase()}`}>{file.uploadStatus === 'CONFIRMED' ? 'Đã tải lên' : file.uploadStatus === 'FAILED' ? 'Thất bại' : 'Chờ xác nhận'}</i></span>
            <span>{formatDateTime(file.createdAt)}</span>
            <span className="action-cell"><details><summary>Hành động <b>⌄</b></summary><div>
              {file.url ? <a href={file.url} target="_blank" rel="noreferrer">Mở tệp</a> : null}
              {file.uploadStatus !== 'CONFIRMED' ? <button type="button" onClick={() => void confirmFile(file.id)}>Kiểm tra và xác nhận</button> : null}
              <button
                type="button"
                className="danger-menu-item"
                disabled={deletingId === file.id}
                onClick={() => void deleteFile(file)}
              >
                {deletingId === file.id ? 'Đang xóa...' : 'Xóa tệp'}
              </button>
            </div></details></span>
          </div>
        ))}
        {message ? <p className="admin-message table-message">{message}</p> : null}
      </section>
    </div>
  );
}
