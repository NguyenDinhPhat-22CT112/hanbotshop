'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  _count?: { products: number };
};

type CategoryResponse = {
  data: Category[];
};

export function CategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('Dang tai danh muc...');

  async function loadCategories() {
    if (!getAdminToken()) {
      setMessage('Vui long dang nhap quan tri truoc.');
      return;
    }

    try {
      const payload = await adminFetch<CategoryResponse>('/categories');
      setCategories(payload.data);
      setMessage(payload.data.length ? '' : 'Chua co danh muc.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong tai duoc danh muc.');
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  async function createCategory(formData: FormData) {
    setMessage('Dang tao danh muc...');

    try {
      await adminFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: String(formData.get('name') ?? ''),
          slug: String(formData.get('slug') ?? ''),
          parentId: String(formData.get('parentId') ?? '') || null
        })
      });
      await loadCategories();
      setMessage('Da tao danh muc.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong tao duoc danh muc.');
    }
  }

  async function updateCategory(category: Category, formData: FormData) {
    setMessage('Dang cap nhat danh muc...');

    try {
      await adminFetch(`/categories/${category.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(formData.get('name') ?? category.name),
          slug: String(formData.get('slug') ?? category.slug),
          parentId: String(formData.get('parentId') ?? '') || null
        })
      });
      setEditingId(null);
      await loadCategories();
      setMessage('Da cap nhat danh muc.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong cap nhat duoc danh muc.');
    }
  }

  async function archiveCategory(category: Category) {
    if (!window.confirm(`Xóa danh mục “${category.name}”? Danh mục chỉ có thể xóa khi không còn ràng buộc sản phẩm.`)) return;
    setMessage('Đang xóa danh mục...');

    try {
      await adminFetch(`/categories/${category.id}`, { method: 'DELETE' });
      await loadCategories();
      setMessage('Đã xóa danh mục.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không xóa được danh mục.');
    }
  }

  return (
    <div className="detail-stack">
      <section className="admin-panel">
        <h2>Tao danh muc</h2>
        <form className="admin-form compact-form" action={createCategory}>
          <label>
            Ten danh muc
            <input name="name" required />
          </label>
          <label>
            Slug
            <input name="slug" required />
          </label>
          <label>
            Danh muc cha
            <select name="parentId" defaultValue="">
              <option value="">Khong co</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Tao danh muc</button>
        </form>
      </section>

      <section className="table-panel">
        <div className="table-row category-row table-head">
          <span>Danh muc</span>
          <span>Slug</span>
          <span>Cha</span>
          <span>San pham</span>
          <span>Thao tac</span>
        </div>
        {categories.map((category) =>
          editingId === category.id ? (
            <form className="table-row category-row" action={(formData) => void updateCategory(category, formData)} key={category.id}>
              <input name="name" defaultValue={category.name} required />
              <input name="slug" defaultValue={category.slug} required />
              <select name="parentId" defaultValue={category.parentId ?? ''}>
                <option value="">Khong co</option>
                {categories
                  .filter((item) => item.id !== category.id)
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <span>{category._count?.products ?? 0}</span>
              <span className="row-actions">
                <button type="submit">Luu</button>
                <button type="button" className="secondary-button" onClick={() => setEditingId(null)}>
                  Huy
                </button>
              </span>
            </form>
          ) : (
            <div className="table-row category-row" key={category.id}>
              <strong>
                {category.name}
                <small>{category.id}</small>
              </strong>
              <span>{category.slug}</span>
              <span>{categories.find((item) => item.id === category.parentId)?.name ?? '-'}</span>
              <span>{category._count?.products ?? 0}</span>
              <span className="action-cell"><details><summary>Hành động <b>⌄</b></summary><div>
                <button type="button" onClick={() => setEditingId(category.id)}>Chỉnh sửa</button>
                <button type="button" className="danger-menu-item" onClick={() => void archiveCategory(category)}>Xóa danh mục</button>
              </div></details></span>
            </div>
          )
        )}
        {message ? <p className="admin-message table-message">{message}</p> : null}
      </section>
    </div>
  );
}
