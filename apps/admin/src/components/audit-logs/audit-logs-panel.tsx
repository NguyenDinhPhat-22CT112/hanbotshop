'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';
import { formatDateTime } from '../../lib/format';
import { PaginationControls, type ListMeta } from '../ui/list-pagination';

type AuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  createdAt: string;
};

type AuditResponse = {
  data: AuditLog[];
  meta: ListMeta;
};

export function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [message, setMessage] = useState('Đang tải nhật ký...');

  async function loadLogs(query = filterQuery, page = 1) {
    if (!getAdminToken()) {
      setMessage('Vui long dang nhap quan tri truoc.');
      return;
    }

    try {
      const payload = await adminFetch<AuditResponse>(`/audit-logs?page=${page}&pageSize=20${query}`);
      setLogs(payload.data);
      setMeta(payload.meta);
      setMessage(payload.data.length ? '' : 'Chưa có nhật ký phù hợp.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong tai duoc audit logs.');
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  function filter(formData: FormData) {
    const params = new URLSearchParams();
    ['action', 'actorId', 'resourceType', 'resourceId'].forEach((key) => {
      const value = String(formData.get(key) ?? '').trim();

      if (value) {
        params.set(key, value);
      }
    });

    const query = params.toString() ? `&${params.toString()}` : '';
    setFilterQuery(query);
    void loadLogs(query, 1);
  }

  return (
    <div className="detail-stack">
      <section className="admin-panel filter-panel">
        <div className="filter-title"><div><strong>Bộ lọc nhật ký</strong><span>Truy vết thao tác quản trị theo đối tượng và người thực hiện</span></div>{meta ? <small>{meta.total} sự kiện</small> : null}</div>
        <form className="admin-form compact-form" action={filter}>
          <label>
            Hành động
            <input name="action" placeholder="STATUS_CHANGE" />
          </label>
          <label>
            Mã người thực hiện
            <input name="actorId" />
          </label>
          <label>
            Loại đối tượng
            <input name="resourceType" placeholder="Order" />
          </label>
          <label>
            Mã đối tượng
            <input name="resourceId" />
          </label>
          <button type="submit">Áp dụng</button>
        </form>
      </section>

      <section className="table-panel">
        <div className="table-row audit-row table-head">
          <span>Hành động</span>
          <span>Đối tượng</span>
          <span>Người thực hiện</span>
          <span>Thời gian</span>
          <span>Thay đổi</span>
        </div>
        {logs.map((log) => (
          <div className="table-row audit-row" key={log.id}>
            <strong>
              {log.action}
              <small>{log.id}</small>
            </strong>
            <span>
              {log.resourceType}
              <br />
              {log.resourceId}
            </span>
            <span>{log.actorId ?? '-'}</span>
            <span>{formatDateTime(log.createdAt)}</span>
            <details className="audit-details"><summary>Xem dữ liệu</summary><pre>{JSON.stringify({ before: log.before, after: log.after, metadata: log.metadata }, null, 2)}</pre></details>
          </div>
        ))}
        {message ? <p className="admin-message table-message">{message}</p> : null}
      </section>
      <PaginationControls meta={meta} onPageChange={(page) => void loadLogs(filterQuery, page)} />
    </div>
  );
}
