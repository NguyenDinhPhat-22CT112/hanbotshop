'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';
import { labelOf } from '../../lib/labels';
import { formatDateTime } from '../../lib/format';

type ProductionJob = {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  assigneeId?: string | null;
  createdAt: string;
  updatedAt: string;
  order: { id: string; orderNumber: string; status: string; paymentStatus: string } | null;
  events: Array<{ id: string; status: string; note?: string | null; createdAt: string }>;
};

type InternalNote = {
  id: string;
  body: string;
  createdAt: string;
};

type TimelineItem = {
  type: string;
  status?: string;
  note?: string;
  noteId?: string;
  createdAt: string;
};

const statusOptions = ['QUEUED', 'PREPARING', 'PRINTING', 'POST_PROCESSING', 'PAINTING', 'QUALITY_CHECK', 'READY', 'BLOCKED', 'DONE'];
const priorityOptions = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export function AdminProductionDetail({ id }: { id: string }) {
  const [job, setJob] = useState<ProductionJob | null>(null);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [message, setMessage] = useState('Dang tai production job...');

  async function loadJob() {
    if (!getAdminToken()) {
      setMessage('Vui long dang nhap quan tri truoc.');
      return;
    }

    try {
      const [jobPayload, notesPayload, timelinePayload] = await Promise.all([
        adminFetch<ProductionJob>(`/production-jobs/${encodeURIComponent(id)}`),
        adminFetch<{ data: InternalNote[] }>(`/production-jobs/${encodeURIComponent(id)}/internal-notes`),
        adminFetch<{ data: TimelineItem[] }>(`/production-jobs/${encodeURIComponent(id)}/timeline`)
      ]);

      setJob(jobPayload);
      setNotes(notesPayload.data);
      setTimeline(timelinePayload.data);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong tai duoc production job.');
    }
  }

  useEffect(() => {
    void loadJob();
  }, [id]);

  async function updateJob(formData: FormData) {
    setMessage('Dang cap nhat production job...');

    try {
      await Promise.all([
        adminFetch(`/production-jobs/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: String(formData.get('status') ?? 'QUEUED'),
            note: String(formData.get('statusNote') ?? '') || null
          })
        }),
        adminFetch(`/production-jobs/${id}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: String(formData.get('priority') ?? 'NORMAL') })
        }),
        adminFetch(`/production-jobs/${id}/assignee`, {
          method: 'PATCH',
          body: JSON.stringify({ assigneeId: String(formData.get('assigneeId') ?? '') || null })
        })
      ]);

      await loadJob();
      setMessage('Da cap nhat production job.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong cap nhat duoc production job.');
    }
  }

  async function addEvent(formData: FormData) {
    setMessage('Dang them event...');

    try {
      await adminFetch(`/production-jobs/${id}/events`, {
        method: 'POST',
        body: JSON.stringify({
          status: String(formData.get('status') ?? 'QUEUED'),
          note: String(formData.get('note') ?? '') || null
        })
      });
      await loadJob();
      setMessage('Da them event.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong them duoc event.');
    }
  }

  async function addNote(formData: FormData) {
    const body = String(formData.get('body') ?? '').trim();

    if (!body) {
      return;
    }

    setMessage('Dang them internal note...');

    try {
      await adminFetch(`/production-jobs/${id}/internal-notes`, {
        method: 'POST',
        body: JSON.stringify({ body })
      });
      await loadJob();
      setMessage('Da them internal note.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Khong them duoc internal note.');
    }
  }

  if (!job) {
    return <p className="admin-message">{message}</p>;
  }

  return (
    <div className="detail-stack">
      <section className="admin-panel detail-grid">
        <div>
          <h2>Thong tin job</h2>
          <dl className="detail-list">
            <div>
              <dt>Status</dt>
              <dd>{labelOf(job.status)}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{job.priority ?? '-'}</dd>
            </div>
            <div>
              <dt>Assignee</dt>
              <dd>{job.assigneeId ?? '-'}</dd>
            </div>
            <div>
              <dt>Cap nhat</dt>
              <dd>{formatDateTime(job.updatedAt)}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2>Don lien ket</h2>
          {job.order ? (
            <dl className="detail-list">
              <div>
                <dt>Order</dt>
                <dd>
                  <a href={`/orders/${job.order.id}`}>{job.order.orderNumber}</a>
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{labelOf(job.order.status)}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{labelOf(job.order.paymentStatus)}</dd>
              </div>
            </dl>
          ) : (
            <p>Chua lien ket don hang.</p>
          )}
        </div>
      </section>

      <section className="admin-panel">
        <h2>Cap nhat job</h2>
        <form className="admin-form compact-form" action={updateJob}>
          <label>
            Status
            <select name="status" defaultValue={job.status}>
              {statusOptions.map((status) => (
                <option value={status} key={status}>
                  {labelOf(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" defaultValue={job.priority ?? 'NORMAL'}>
              {priorityOptions.map((priority) => (
                <option value={priority} key={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assignee ID
            <input name="assigneeId" defaultValue={job.assigneeId ?? ''} />
          </label>
          <label>
            Ghi chu status
            <input name="statusNote" />
          </label>
          <button className="wide-field" type="submit">
            Luu job
          </button>
        </form>
      </section>

      <section className="detail-two-column">
        <section className="admin-panel">
          <h2>Them event</h2>
          <form className="admin-form" action={addEvent}>
            <label>
              Status
              <select name="status" defaultValue={job.status}>
                {statusOptions.map((status) => (
                  <option value={status} key={status}>
                    {labelOf(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Note
              <textarea name="note" />
            </label>
            <button type="submit">Them event</button>
          </form>
        </section>
        <section className="admin-panel">
          <h2>Internal notes</h2>
          <form className="admin-form" action={addNote}>
            <label>
              Noi dung
              <textarea name="body" required />
            </label>
            <button type="submit">Them note</button>
          </form>
          <div className="detail-list-block">
            {notes.map((note) => (
              <article key={note.id}>
                <strong>{formatDateTime(note.createdAt)}</strong>
                <p>{note.body}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="detail-two-column">
        <section className="admin-panel">
          <h2>Timeline</h2>
          <div className="detail-list-block">
            {timeline.map((item, index) => (
              <article key={`${item.type}-${item.createdAt}-${index}`}>
                <strong>{labelOf(item.status ?? item.type)}</strong>
                <small>{formatDateTime(item.createdAt)}</small>
                {item.note ? <p>{item.note}</p> : null}
              </article>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <h2>Events</h2>
          <div className="detail-list-block">
            {job.events.map((event) => (
              <article key={event.id}>
                <strong>{labelOf(event.status)}</strong>
                <small>{formatDateTime(event.createdAt)}</small>
                {event.note ? <p>{event.note}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </section>

      {message ? <p className="admin-message">{message}</p> : null}
    </div>
  );
}
