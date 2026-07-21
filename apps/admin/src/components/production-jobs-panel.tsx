'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../lib/browser-api';

type ProductionJob = {
  id: string;
  title: string;
  status: string;
  order: { orderNumber: string } | null;
  updatedAt: string;
};

type ProductionResponse = {
  data: ProductionJob[];
};

const statusOptions = [
  ['QUEUED', 'Đang chờ'],
  ['PREPARING', 'Đang chuẩn bị'],
  ['PRINTING', 'Đang in'],
  ['POST_PROCESSING', 'Hậu xử lý'],
  ['PAINTING', 'Đang sơn'],
  ['QUALITY_CHECK', 'Kiểm tra chất lượng'],
  ['READY', 'Sẵn sàng'],
  ['BLOCKED', 'Đang vướng'],
  ['DONE', 'Đã xong']
];

export function ProductionJobsPanel() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [message, setMessage] = useState('Đang tải công việc sản xuất...');

  async function loadJobs() {
    if (!getAdminToken()) {
      setMessage('Vui lòng đăng nhập quản trị trước.');
      return;
    }

    try {
      const payload = await adminFetch<ProductionResponse>('/production-jobs?pageSize=100');
      setJobs(payload.data);
      setMessage(payload.data.length ? '' : 'Chưa có công việc sản xuất.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được công việc sản xuất.');
    }
  }

  useEffect(() => {
    void loadJobs();
  }, []);

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
    <>
      <section className="table-panel">
        <div className="table-row production-row table-head">
          <span>Công việc</span>
          <span>Đơn hàng</span>
          <span>Trạng thái</span>
          <span>Ghi chú</span>
          <span>Cập nhật</span>
        </div>
        {jobs.length ? (
          jobs.map((job) => (
            <form className="table-row production-row production-manage-row" action={(formData) => void updateStatus(job.id, formData)} key={job.id}>
              <strong>
                <a href={`/production/${encodeURIComponent(job.id)}`}>{job.title}</a>
                <small>{job.id}</small>
              </strong>
              <span>{job.order?.orderNumber ?? 'Chưa liên kết'}</span>
              <label>
                <small>Trạng thái</small>
                <select name="status" defaultValue={job.status}>
                  {statusOptions.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <input name="note" placeholder="Ghi chú cập nhật" />
              <button type="submit">Lưu</button>
            </form>
          ))
        ) : (
          <div className="table-row production-row">
            <span>{message}</span>
          </div>
        )}
      </section>

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
              {statusOptions.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
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
      {message ? <p className="admin-message">{message}</p> : null}
    </>
  );
}
