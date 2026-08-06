'use client';

import { useEffect, useState } from 'react';
import { adminFetch, getAdminToken } from '../../lib/browser-api';
import { buildQuery, type ListMeta } from '../ui/list-pagination';
import { OrderToolbar } from './OrderToolbar';
import { OrderTabs } from './OrderTabs';
import { OrderFilters } from './OrderFilters';
import { OrderCard } from './OrderCard';
import { ResinCard } from './ResinCard';
import { BulkActions } from './BulkActions';
import { ModernPagination } from './ModernPagination';
import { ORDER_STATUSES, RESIN_STATUSES } from './constants';
import type { BaseOrder, ResinOrder, OrderFilters as Filters, OrderType } from './types';

interface OrderResponse {
    data: BaseOrder[];
    meta: ListMeta;
}

const defaultFilters: Filters = {
    type: 'ORDER',
    q: '',
    status: '',
    paymentStatus: '',
    shippingStatus: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    pageSize: 20
};

export function ModernOrdersPanel() {
    const [orders, setOrders] = useState<BaseOrder[]>([]);
    const [filters, setFilters] = useState<Filters>(defaultFilters);
    const [meta, setMeta] = useState<ListMeta | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    async function loadOrders(nextFilters = filters) {
        if (!getAdminToken()) {
            setMessage('Vui lòng đăng nhập quản trị trước.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const payload = await adminFetch<OrderResponse>(`/orders?${buildQuery(nextFilters)}`);
            setOrders(payload.data);
            setMeta(payload.meta);
            setFilters(nextFilters);

            if (payload.data.length === 0) {
                setMessage('Không tìm thấy đơn hàng phù hợp với bộ lọc.');
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không tải được đơn hàng.');
            setOrders([]);
            setMeta(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadOrders(defaultFilters);

        const reload = () => void loadOrders(filters);
        window.addEventListener('admin:data-changed', reload);

        return () => window.removeEventListener('admin:data-changed', reload);
    }, []);

    function handleTypeChange(type: OrderType) {
        void loadOrders({ ...defaultFilters, type, page: 1 });
        setSelectedIds(new Set());
    }

    function handleApplyFilters(formData: FormData) {
        const newFilters: Filters = {
            type: filters.type,
            q: String(formData.get('q') ?? '').trim(),
            status: String(formData.get('status') ?? ''),
            paymentStatus: String(formData.get('paymentStatus') ?? ''),
            shippingStatus: String(formData.get('shippingStatus') ?? ''),
            dateFrom: String(formData.get('dateFrom') ?? ''),
            dateTo: String(formData.get('dateTo') ?? ''),
            page: 1,
            pageSize: Number(formData.get('pageSize') ?? 20)
        };

        void loadOrders(newFilters);
        setSelectedIds(new Set());
    }

    function handleResetFilters() {
        void loadOrders({ ...defaultFilters, type: filters.type });
        setSelectedIds(new Set());
    }

    async function handleUpdateOrder(orderId: string, formData: FormData) {
        const status = String(formData.get('status') ?? '');
        const trackingCarrier = String(formData.get('trackingCarrier') ?? '').trim();
        const trackingNumber = String(formData.get('trackingNumber') ?? '').trim();

        try {
            if (status) {
                await adminFetch(`/orders/${orderId}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status })
                });
            }

            if (trackingCarrier && trackingNumber) {
                await adminFetch(`/orders/${orderId}/tracking`, {
                    method: 'PATCH',
                    body: JSON.stringify({ trackingCarrier, trackingNumber })
                });
            }

            await loadOrders();
            setMessage('✓ Đã cập nhật đơn hàng thành công');

            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không cập nhật được đơn hàng.');
        }
    }

    async function handleDeleteOrder(orderId: string) {
        const order = orders.find((o) => o.id === orderId);

        if (!window.confirm(
            `Xóa vĩnh viễn đơn hàng "${order?.orderNumber ?? orderId}"?\n\nĐơn hàng và toàn bộ dữ liệu liên quan sẽ bị xóa và không thể khôi phục.`
        )) {
            return;
        }

        setDeleting(true);

        try {
            await adminFetch(`/orders/${orderId}`, { method: 'DELETE' });

            setSelectedIds((current) => {
                const next = new Set(current);
                next.delete(orderId);
                return next;
            });

            await loadOrders();
            window.dispatchEvent(new Event('admin:data-changed'));
            setMessage('✓ Đã xóa đơn hàng');

            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không xóa được đơn hàng.');
        } finally {
            setDeleting(false);
        }
    }

    async function handleMarkDepositPaid(orderId: string) {
        try {
            await adminFetch(`/orders/${orderId}/payment`, {
                method: 'PATCH',
                body: JSON.stringify({ paymentStatus: 'DEPOSIT_PAID' })
            });

            await loadOrders();
            setMessage('✓ Đã đánh dấu thanh toán cọc');

            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không cập nhật được thanh toán.');
        }
    }

    async function handleMarkFullyPaid(orderId: string) {
        try {
            await adminFetch(`/orders/${orderId}/payment`, {
                method: 'PATCH',
                body: JSON.stringify({ paymentStatus: 'PAID' })
            });

            await loadOrders();
            setMessage('✓ Đã đánh dấu thanh toán toàn bộ');

            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không cập nhật được thanh toán.');
        }
    }

    async function handleBulkDelete() {
        const ids = [...selectedIds];

        if (!window.confirm(
            `Xóa vĩnh viễn ${ids.length} đơn hàng đã chọn?\n\nĐơn hàng và toàn bộ dữ liệu liên quan (ghi chú, sự kiện, thanh toán) sẽ bị xóa và không thể khôi phục.`
        )) {
            return;
        }

        setDeleting(true);

        try {
            await adminFetch('/orders/bulk-delete', {
                method: 'POST',
                body: JSON.stringify({ ids })
            });

            setSelectedIds(new Set());
            await loadOrders();
            window.dispatchEvent(new Event('admin:data-changed'));
            setMessage(`✓ Đã xóa ${ids.length} đơn hàng`);

            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không xóa được đơn hàng.');
        } finally {
            setDeleting(false);
        }
    }

    function handleToggleSelect(orderId: string) {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    }

    function handleToggleSelectAll() {
        setSelectedIds((current) => {
            if (current.size === orders.length && orders.length > 0) {
                return new Set();
            }
            return new Set(orders.map((order) => order.id));
        });
    }

    function handleExport() {
        alert('Export functionality would be implemented here');
    }

    function handleBulkExport() {
        alert(`Export ${selectedIds.size} selected orders`);
    }

    const statuses = filters.type === 'ORDER' ? ORDER_STATUSES : RESIN_STATUSES;

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <OrderToolbar
                totalOrders={meta?.total}
                onRefresh={() => loadOrders(filters)}
                onExport={handleExport}
                refreshing={loading}
            />

            {/* Tabs */}
            <OrderTabs
                activeType={filters.type}
                orderCount={filters.type === 'ORDER' ? meta?.total : undefined}
                resinCount={filters.type === 'RESIN' ? meta?.total : undefined}
                onTypeChange={handleTypeChange}
            />

            {/* Filters */}
            <OrderFilters
                filters={filters}
                onApplyFilters={handleApplyFilters}
                onReset={handleResetFilters}
            />

            {/* Select All */}
            {orders.length > 0 && (
                <div className="flex items-center gap-3 px-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={orders.length > 0 && selectedIds.size === orders.length}
                            onChange={handleToggleSelectAll}
                            className="w-5 h-5 rounded border-gray-300 text-[#d6382f] focus:ring-[#d6382f] cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                            Chọn tất cả {orders.length} đơn hàng trên trang này
                        </span>
                    </label>
                </div>
            )}

            {/* Orders Grid */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-16">
                        <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#d6382f] rounded-full animate-spin" />
                        <p className="mt-4 text-gray-500 font-medium">Đang tải đơn hàng...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                        <div className="text-6xl mb-4">📦</div>
                        <p className="text-lg font-semibold text-gray-700 mb-2">Không tìm thấy đơn hàng</p>
                        <p className="text-sm text-gray-500">
                            {message || 'Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác'}
                        </p>
                    </div>
                ) : (
                    orders.map((order) => {
                        const isResinWithExtendedData = order.type === 'RESIN' &&
                            ('characterName' in order || 'timeline' in order || 'depositAmount' in order);

                        return isResinWithExtendedData ? (
                            <ResinCard
                                key={order.id}
                                order={order as ResinOrder}
                                selected={selectedIds.has(order.id)}
                                statuses={statuses}
                                onToggleSelect={() => handleToggleSelect(order.id)}
                                onUpdate={(formData) => handleUpdateOrder(order.id, formData)}
                                onDelete={() => handleDeleteOrder(order.id)}
                                onMarkDepositPaid={() => handleMarkDepositPaid(order.id)}
                                onMarkFullyPaid={() => handleMarkFullyPaid(order.id)}
                                deleting={deleting}
                            />
                        ) : (
                            <OrderCard
                                key={order.id}
                                order={order}
                                selected={selectedIds.has(order.id)}
                                statuses={statuses}
                                onToggleSelect={() => handleToggleSelect(order.id)}
                                onUpdate={(formData) => handleUpdateOrder(order.id, formData)}
                                onDelete={() => handleDeleteOrder(order.id)}
                                deleting={deleting}
                            />
                        );
                    })
                )}
            </div>

            {/* Message */}
            {message && !loading && (
                <div
                    className={`
            fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl font-semibold
            ${message.startsWith('✓') ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
            animate-slide-in
          `}
                >
                    {message}
                </div>
            )}

            {/* Pagination */}
            <ModernPagination
                meta={meta}
                onPageChange={(page) => loadOrders({ ...filters, page })}
            />

            {/* Bulk Actions */}
            <BulkActions
                selectedCount={selectedIds.size}
                onClearSelection={() => setSelectedIds(new Set())}
                onBulkDelete={handleBulkDelete}
                onBulkExport={handleBulkExport}
                deleting={deleting}
            />
        </div>
    );
}
