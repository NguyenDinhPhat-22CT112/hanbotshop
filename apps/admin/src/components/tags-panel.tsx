'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { createProductSlug } from '../lib/product-slug';

type Tag = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  _count: { products: number };
};

export function TagsPanel() {
  const createFormRef = useRef<HTMLFormElement>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('Đang tải tag...');
  const [tagName, setTagName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugWasEdited, setSlugWasEdited] = useState(false);

  async function loadTags(search = query) {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const suffix = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
      const payload = await adminFetch<{ data: Tag[] }>(`/tags${suffix}`);
      setTags(payload.data);
      setMessage(payload.data.length ? '' : search.trim() ? 'Không tìm thấy tag phù hợp.' : 'Chưa có tag.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được tag.');
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTags(query);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  async function createTag(formData: FormData) {
    setMessage('Đang tạo tag...');

    try {
      await adminFetch('/tags', {
        method: 'POST',
        body: JSON.stringify({
          name: String(formData.get('name') ?? ''),
          slug: String(formData.get('slug') ?? '')
        })
      });
      createFormRef.current?.reset();
      setTagName('');
      setSlug('');
      setSlugWasEdited(false);
      await loadTags();
      setMessage('Đã tạo tag mới.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tạo được tag.');
    }
  }

  async function updateTag(tag: Tag, formData: FormData) {
    setMessage(`Đang cập nhật “${tag.name}”...`);

    try {
      await adminFetch(`/tags/${tag.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(formData.get('name') ?? tag.name),
          slug: String(formData.get('slug') ?? tag.slug)
        })
      });
      setEditingId(null);
      await loadTags();
      setMessage('Đã cập nhật tag.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được tag.');
    }
  }

  async function deleteTag(tag: Tag) {
    const usage = tag._count.products;
    const usageText = usage
      ? `\n\nTag đang gắn với ${usage} sản phẩm. Xóa tag sẽ gỡ tag khỏi các sản phẩm này nhưng không xóa sản phẩm.`
      : '';

    if (!window.confirm(`Xóa tag “${tag.name}”?${usageText}\n\nThao tác này không thể hoàn tác.`)) {
      return;
    }

    setMessage(`Đang xóa “${tag.name}”...`);

    try {
      await adminFetch(`/tags/${tag.id}`, { method: 'DELETE' });
      await loadTags();
      setMessage(`Đã xóa tag “${tag.name}”.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không xóa được tag.');
    }
  }

  return (
    <div className="detail-stack">
      <section className="admin-panel tag-management-toolbar">
        <div className="management-toolbar">
          <div>
            <strong>Tạo tag tái sử dụng</strong>
            <span>Tag tạo tại đây sẽ xuất hiện trong vùng kéo-thả khi thêm hoặc sửa sản phẩm.</span>
          </div>
          <small>{tags.length} kết quả</small>
        </div>
        <form ref={createFormRef} className="admin-form tag-create-form" action={createTag}>
          <label>
            Tên tag
            <input
              name="name"
              required
              value={tagName}
              placeholder="Ví dụ: Nendoroid"
              onChange={(event) => {
                const nextName = event.target.value;
                setTagName(nextName);
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
              placeholder="nendoroid"
              onChange={(event) => {
                const nextSlug = event.target.value;
                setSlug(nextSlug);
                setSlugWasEdited(nextSlug !== createProductSlug(tagName));
              }}
            />
          </label>
          <button type="submit">Thêm tag</button>
        </form>
      </section>

      <section className="admin-panel tag-search-panel">
        <label className="tag-search-field">
          <span>Tìm kiếm tag</span>
          <div>
            <b aria-hidden="true">⌕</b>
            <input
              type="search"
              value={query}
              placeholder="Nhập tên hoặc slug..."
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? <button type="button" onClick={() => setQuery('')}>Xóa</button> : null}
          </div>
        </label>
      </section>

      <section className="table-panel tags-table">
        <div className="table-row tag-management-row table-head">
          <span>Tag</span>
          <span>Slug</span>
          <span>Loại</span>
          <span>Sản phẩm đang dùng</span>
          <span>Thao tác</span>
        </div>
        {tags.map((tag) =>
          editingId === tag.id ? (
            <form
              className="table-row tag-management-row tag-edit-row"
              action={(formData) => void updateTag(tag, formData)}
              key={tag.id}
            >
              <input name="name" defaultValue={tag.name} required />
              <input name="slug" defaultValue={tag.slug} required />
              <span><i className="tag-kind-badge">Tùy chỉnh</i></span>
              <span>{tag._count.products} sản phẩm</span>
              <span className="row-actions">
                <button type="submit">Lưu</button>
                <button type="button" className="secondary-button" onClick={() => setEditingId(null)}>Hủy</button>
              </span>
            </form>
          ) : (
            <div className="table-row tag-management-row" key={tag.id}>
              <strong>
                {tag.name}
                <small>{tag.id}</small>
              </strong>
              <span>{tag.slug}</span>
              <span>
                <i className={`tag-kind-badge${tag.isSystem ? ' is-system' : ''}`}>
                  {tag.isSystem ? 'Hệ thống' : 'Tùy chỉnh'}
                </i>
              </span>
              <span><b className="tag-product-count">{tag._count.products}</b> sản phẩm</span>
              <span className="action-cell">
                <details>
                  <summary>Hành động <b>⌄</b></summary>
                  <div>
                    <button type="button" disabled={tag.isSystem} onClick={() => setEditingId(tag.id)}>
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      disabled={tag.isSystem}
                      className="danger-menu-item"
                      onClick={() => void deleteTag(tag)}
                    >
                      Xóa tag
                    </button>
                  </div>
                </details>
              </span>
            </div>
          )
        )}
        {message ? <p className="admin-message table-message">{message}</p> : null}
      </section>
    </div>
  );
}
