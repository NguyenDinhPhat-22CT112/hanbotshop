'use client';

export type ListMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  return query.toString();
}

export function PaginationControls({
  meta,
  onPageChange
}: {
  meta: ListMeta | null;
  onPageChange: (page: number) => void;
}) {
  if (!meta) {
    return null;
  }

  const lastPage = Math.max(meta.pageCount, 1);
  const pages = Array.from({ length: lastPage }, (_, index) => index + 1)
    .filter((page) => page === 1 || page === lastPage || Math.abs(page - meta.page) <= 1);

  return (
    <div className="pagination-bar">
      <span>
        Hiển thị {(meta.page - 1) * meta.pageSize + (meta.total ? 1 : 0)}–{Math.min(meta.page * meta.pageSize, meta.total)} trong {meta.total} kết quả
      </span>
      <div>
        <button type="button" className="secondary-button" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
          ‹
        </button>
        {pages.map((page, index) => (
          <span key={page} className="pagination-page-wrap">
            {index > 0 && page - pages[index - 1]! > 1 ? <i>…</i> : null}
            <button type="button" className={page === meta.page ? 'pagination-current' : 'secondary-button'} aria-current={page === meta.page ? 'page' : undefined} onClick={() => onPageChange(page)}>{page}</button>
          </span>
        ))}
        <button type="button" className="secondary-button" disabled={meta.page >= meta.pageCount} onClick={() => onPageChange(meta.page + 1)}>
          ›
        </button>
      </div>
    </div>
  );
}
