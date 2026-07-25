'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';
import { createProductSlug } from '../lib/product-slug';

type CategoryPlacement = 'ORDER' | 'RESIN' | 'BOTH';

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  placement: CategoryPlacement;
  _count?: { products: number };
};

type CategoryResponse = {
  data: Category[];
};

function placementFromForm(formData: FormData): CategoryPlacement | null {
  const showOnOrder = formData.get('showOnOrder') === 'on';
  const showOnResin = formData.get('showOnResin') === 'on';

  if (showOnOrder && showOnResin) return 'BOTH';
  if (showOnOrder) return 'ORDER';
  if (showOnResin) return 'RESIN';
  return null;
}

export function CategoriesPanel() {
  const createFormRef = useRef<HTMLFormElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('Đang tải danh mục...');
  const [categoryName, setCategoryName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugWasEdited, setSlugWasEdited] = useState(false);

  async function loadCategories() {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const payload = await adminFetch<CategoryResponse>('/categories');
      setCategories(payload.data);
      setMessage(payload.data.length ? '' : 'Chưa có danh mục.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được danh mục.');
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  async function createCategory(formData: FormData) {
    setMessage('Đang tạo danh mục...');
    const placement = placementFromForm(formData);

    if (!placement) {
      setMessage('Vui lòng chọn ít nhất một trang hiển thị cho danh mục.');
      return;
    }

    try {
      await adminFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: String(formData.get('name') ?? ''),
          slug: String(formData.get('slug') ?? ''),
          parentId: String(formData.get('parentId') ?? '') || null,
          placement
        })
      });
      createFormRef.current?.reset();
      setCategoryName('');
      setSlug('');
      setSlugWasEdited(false);
      await loadCategories();
      setMessage('Đã tạo danh mục.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tạo được danh mục.');
    }
  }

  async function updateCategory(category: Category, formData: FormData) {
    setMessage('Đang cập nhật danh mục...');
    const placement = placementFromForm(formData);

    if (!placement) {
      setMessage('Vui lòng chọn ít nhất một trang hiển thị cho danh mục.');
      return;
    }

    try {
      await adminFetch(`/categories/${category.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(formData.get('name') ?? category.name),
          slug: String(formData.get('slug') ?? category.slug),
          parentId: String(formData.get('parentId') ?? '') || null,
          placement
        })
      });
      setEditingId(null);
      await loadCategories();
      setMessage('Đã cập nhật danh mục.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được danh mục.');
    }
  }

  async function archiveCategory(category: Category) {
    if (!window.confirm(`Xóa danh mục “${category.name}”? Danh mục chỉ có thể xóa khi không còn ràng buộc sản phẩm.`)) {
      return;
    }

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
        <h2>Tạo danh mục</h2>
        <form ref={createFormRef} className="admin-form compact-form" action={createCategory}>
          <label>
            Tên danh mục
            <input
              name="name"
              required
              value={categoryName}
              onChange={(event) => {
                const nextName = event.target.value;
                setCategoryName(nextName);
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
                setSlugWasEdited(nextSlug !== createProductSlug(categoryName));
              }}
            />
            <small>Tự tạo theo tên danh mục; bạn vẫn có thể sửa lại.</small>
          </label>
          <fieldset className="category-placement-field">
            <legend>Hiển thị tại trang</legend>
            <div className="category-placement-options">
              <label>
                <input name="showOnOrder" type="checkbox" defaultChecked />
                <span>Order</span>
              </label>
              <label>
                <input name="showOnResin" type="checkbox" defaultChecked />
                <span>Resin</span>
              </label>
            </div>
            <small>Có thể chọn một hoặc cả hai trang.</small>
          </fieldset>
          <label>
            Danh mục cha
            <select name="parentId" defaultValue="">
              <option value="">Không có — danh mục cấp cao nhất</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <small>Dùng khi danh mục này nằm bên trong một danh mục lớn hơn.</small>
          </label>
          <button type="submit">Tạo danh mục</button>
        </form>
      </section>

      <section className="table-panel">
        <div className="table-row category-row table-head">
          <span>Danh mục</span>
          <span>Slug</span>
          <span>Danh mục cha</span>
          <span>Hiển thị tại</span>
          <span>Sản phẩm</span>
          <span>Thao tác</span>
        </div>
        {categories.map((category) =>
          editingId === category.id ? (
            <form
              className="table-row category-row"
              action={(formData) => void updateCategory(category, formData)}
              key={category.id}
            >
              <input name="name" defaultValue={category.name} required />
              <input name="slug" defaultValue={category.slug} required />
              <select name="parentId" defaultValue={category.parentId ?? ''}>
                <option value="">Không có</option>
                {categories
                  .filter((item) => item.id !== category.id)
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <span className="category-placement-options is-compact">
                <label>
                  <input
                    name="showOnOrder"
                    type="checkbox"
                    defaultChecked={category.placement === 'ORDER' || category.placement === 'BOTH'}
                  />
                  <span>Order</span>
                </label>
                <label>
                  <input
                    name="showOnResin"
                    type="checkbox"
                    defaultChecked={category.placement === 'RESIN' || category.placement === 'BOTH'}
                  />
                  <span>Resin</span>
                </label>
              </span>
              <span>{category._count?.products ?? 0}</span>
              <span className="row-actions">
                <button type="submit">Lưu</button>
                <button type="button" className="secondary-button" onClick={() => setEditingId(null)}>
                  Hủy
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
              <span>{categories.find((item) => item.id === category.parentId)?.name ?? 'Không có'}</span>
              <span className="category-placement-badges">
                {category.placement === 'ORDER' || category.placement === 'BOTH' ? <i>Order</i> : null}
                {category.placement === 'RESIN' || category.placement === 'BOTH' ? <i>Resin</i> : null}
              </span>
              <span>{category._count?.products ?? 0}</span>
              <span className="action-cell">
                <details>
                  <summary>
                    Hành động <b>⌄</b>
                  </summary>
                  <div>
                    <button type="button" onClick={() => setEditingId(category.id)}>
                      Chỉnh sửa
                    </button>
                    <button type="button" className="danger-menu-item" onClick={() => void archiveCategory(category)}>
                      Xóa danh mục
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
