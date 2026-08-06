'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';
import { labelOf } from '../../lib/labels';
import { buildQuery, PaginationControls, type ListMeta } from '../ui/list-pagination';

type ProductionJob = {
  id: string;
  title: string;
  status: string;
  order: { orderNumber: string } | null;
  updatedAt: string;
};

type ProductionResponse = {
  data: ProductionJob[];
  meta: ListMeta;
};

type Filters = {
  q: string;
  status: string;
  priority: string;
  orderId: string;
  page: number;
  pageSize: number;
};

const defaultFilters: Filters = {
  q: '',
  status: '',
  priority: '',
  orderId: '',
  page: 1,
  pageSize: 20
};

const statusOptions = ['QUEUED', 'PREPARING', 'PRINTING', 'POST_PROCESSING', 'PAINTING', 'QUALITY_CHECK', 'READY', 'BLOCKED', 'DONE'];
const priorityOptions = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export function ProductionAdminPanel() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [message, setMessage] = useState('Đang tải công việc sản xuất...');

  async function loadJobs(nextFilters = filters) {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const payload = await adminFetch<ProductionResponse>(`/production-jobs?${buildQuery(nextFilters)}`);
      setJobs(payload.data);
      setMeta(payload.meta);
      setFilters(nextFilters);
      setMessage(payload.data.length ? '' : 'Không có công việc sản xuất phù hợp.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được công việc sản xuất.');
    }
  }

  useEffect(() => {
    void loadJobs(defaultFilters);
  }, []);

  function applyFilters(formData: FormData) {
    void loadJobs({
      q: String(formData.get('q') ?? '').trim(),
      status: String(formData.get('status') ?? ''),
      priority: String(formData.get('priority') ?? ''),
      orderId: String(formData.get('orderId') ?? '').trim(),
      page: 1,
      pageSize: Number(formData.get('pageSize') ?? 20)
    });
  }

  async function createJob(formData: FormData) {
    const orderId = String(formData.get('orderId') ?? '').trim();
    setMessage('Đang tạo công việc sản xuất...');

    try {
      await adminFetch('/production-jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: String(formData.get('title') ?? ''),
          orderId,
          status: String(formData.get('status') ?? 'QUEUED'),
          note: String(formData.get('note') ?? '') || null
        })
      });
      await loadJobs();
      setMessage('Đã tạo công việc sản xuất.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tạo được công việc sản xuất.');
    }
  }

  async function updateStatus(jobId: string, formData: FormData) {
    setMessage('Đang cập nhật công việc sản xuất...');

    try {
      await adminFetch(`/production-jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: String(formData.get('status') ?? 'QUEUED'),
          note: String(formData.get('note') ?? '') || null
        })
      });
      await loadJobs();
      setMessage('Đã cập nhật công việc sản xuất.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không cập nhật được công việc sản xuất.');
    }
  }

  return (
    <div className="detail-stack">
      <section className="admin-panel filter-panel">
        <div className="filter-title"><div><strong>Bộ lọc sản xuất</strong><span>Theo dõi công việc, ưu tiên và đơn hàng</span></div>{meta ? <small>{meta.total} công việc</small> : null}</div>
        <form className="admin-form filter-form" action={applyFilters}>
          <label>
            Search
            <input name="q" defaultValue={filters.q} placeholder="Title hoặc mã đơn" />
          </label>
          <label>
            Status
            <select name="status" defaultValue={filters.status}>
              <option value="">Tất cả</option>
              {statusOptions.map((status) => (
                <option value={status} key={status}>
                  {labelOf(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" defaultValue={filters.priority}>
              <option value="">Tất cả</option>
              {priorityOptions.map((priority) => (
                <option value={priority} key={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            Order ID
            <input name="orderId" defaultValue={filters.orderId} placeholder="Lọc theo orderId" />
          </label>
          <label>
            Page size
            <select name="pageSize" defaultValue={filters.pageSize}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <button type="submit">Lọc</button>
        </form>
      </section>

      <section className="table-panel">
        <div className="table-row production-row table-head">
          <span>Công việc</span>
          <span>Đơn hàng</span>
          <span>Trạng thái</span>
          <span>Ghi chú</span>
          <span>Cập nhật</span>
        </div>
        {jobs.map((job) => (
          <form className="table-row production-row production-manage-row" action={(formData) => void updateStatus(job.id, formData)} key={job.id}>
            <strong>
              <a href={`/production/${encodeURIComponent(job.id)}`}>{job.title}</a>
              <small>{job.id}</small>
            </strong>
            <span>{job.order?.orderNumber ?? 'Chưa liên kết'}</span>
            <label>
              <small>Trạng thái</small>
              <select name="status" defaultValue={job.status}>
                {statusOptions.map((status) => (
                  <option value={status} key={status}>
                    {labelOf(status)}
                  </option>
                ))}
              </select>
            </label>
            <input name="note" placeholder="Ghi chú cập nhật" />
            <button type="submit">Lưu</button>
          </form>
        ))}
        {message ? <p className="admin-message table-message">{message}</p> : null}
      </section>
      <PaginationControls meta={meta} onPageChange={(page) => void loadJobs({ ...filters, page })} />

      <section className="admin-panel">
        <h2>Tạo công việc sản xuất</h2>
        <form className="admin-form compact-form" action={createJob}>
          <label>
            Tiêu đề
            <input name="title" required />
          </label>
          <label>
            ID đơn hàng
            <input name="orderId" required />
          </label>
          <label>
            Trạng thái
            <select name="status" defaultValue="QUEUED">
              {statusOptions.map((status) => (
                <option value={status} key={status}>
                  {labelOf(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ghi chú
            <textarea name="note" />
          </label>
          <button type="submit">Tạo công việc</button>
        </form>
      </section>
    </div>
  );
}
