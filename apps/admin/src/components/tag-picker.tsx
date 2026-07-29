'use client';

import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { adminFetch } from '../lib/browser-api';

type Tag = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  _count?: { products: number };
};

const systemTagSlugs = new Set(['order', 'resin']);
const maxSelectableTags = 29;

export function TagPicker({
  selected,
  onChange
}: {
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('Đang tải tag...');
  const [dropActive, setDropActive] = useState(false);

  useEffect(() => {
    adminFetch<{ data: Tag[] }>('/tags')
      .then((payload) => {
        setTags(payload.data);
        setMessage(payload.data.length ? '' : 'Chưa có tag. Hãy tạo tag trong Danh mục → Quản lý tag.');
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : 'Không tải được danh sách tag.');
      });
  }, []);

  const selectedKeys = useMemo(
    () => new Set(selected.map((name) => name.toLocaleLowerCase('vi'))),
    [selected]
  );
  const availableTags = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');

    if (selected.length >= maxSelectableTags) {
      return [];
    }

    return tags.filter((tag) => {
      if (tag.isSystem || systemTagSlugs.has(tag.slug) || selectedKeys.has(tag.name.toLocaleLowerCase('vi'))) {
        return false;
      }

      return !normalizedQuery
        || tag.name.toLocaleLowerCase('vi').includes(normalizedQuery)
        || tag.slug.toLocaleLowerCase('vi').includes(normalizedQuery);
    });
  }, [query, selected.length, selectedKeys, tags]);

  function addTag(tag: Tag) {
    if (selected.length >= maxSelectableTags || selectedKeys.has(tag.name.toLocaleLowerCase('vi'))) {
      return;
    }

    onChange([...selected, tag.name]);
  }

  function removeTag(name: string) {
    onChange(selected.filter((tag) => tag !== name));
  }

  function startDragging(event: DragEvent<HTMLElement>, tag: Tag) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-hanbotorder-tag', tag.id);
    event.dataTransfer.setData('text/plain', tag.name);
  }

  function dropTag(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDropActive(false);
    const tagId = event.dataTransfer.getData('application/x-hanbotorder-tag');
    const tag = tags.find((item) => item.id === tagId);

    if (tag) {
      addTag(tag);
    }
  }

  return (
    <section className="tag-picker" aria-labelledby="product-tags-title">
      <div className="tag-picker-heading">
        <div>
          <strong id="product-tags-title">Tag sản phẩm</strong>
          <span>Kéo tag từ danh sách bên trái sang vùng đã chọn, hoặc bấm trực tiếp vào tag.</span>
        </div>
        <a href="/categories/tags">Quản lý tag</a>
      </div>

      <div className="tag-picker-grid">
        <div className="tag-source">
          <label>
            Tìm tag
            <input
              type="search"
              value={query}
              placeholder="Tên hoặc slug..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="tag-source-list" aria-label="Tag có thể chọn">
            {availableTags.map((tag) => (
              <button
                type="button"
                draggable
                className="tag-choice"
                key={tag.id}
                onClick={() => addTag(tag)}
                onDragStart={(event) => startDragging(event, tag)}
              >
                <span>{tag.name}</span>
                <small>{tag._count?.products ?? 0} sản phẩm</small>
                <b aria-hidden="true">＋</b>
              </button>
            ))}
            {!availableTags.length && !message ? <p>Không còn tag phù hợp.</p> : null}
            {message ? <p>{message}</p> : null}
          </div>
        </div>

        <div
          className={`tag-dropzone${dropActive ? ' is-active' : ''}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDropActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDropActive(false);
            }
          }}
          onDrop={dropTag}
        >
          <div className="tag-dropzone-title">
            <strong>Tag đã chọn</strong>
            <span>{selected.length}/{maxSelectableTags} tag tùy chỉnh</span>
          </div>
          {selected.length ? (
            <div className="selected-tag-list">
              {selected.map((name) => (
                <span key={name}>
                  {name}
                  <button type="button" aria-label={`Bỏ tag ${name}`} onClick={() => removeTag(name)}>×</button>
                </span>
              ))}
            </div>
          ) : (
            <div className="tag-dropzone-empty">
              <b aria-hidden="true">↳</b>
              <strong>Thả tag vào đây</strong>
              <span>Tag Order hoặc Resin được hệ thống tự gắn theo loại sản phẩm.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
