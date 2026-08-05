'use client';

import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import type { BaseOrder } from './types';

interface OrderCardProps {
    order: BaseOrder;
    selected: boolean;
    statuses: readonly string[];
    onToggleSelect: () => void;
    onUpdate: (formData: FormData) => void;
    onDelete: () => void;
    deleting: boolean;
}

export function OrderCard({
    order,
    selected,
    statuses,
    onToggleSelect,
    onUpdate,
    onDelete,
    deleting
}: OrderCardProps) {
    const [isEditing, setIsEditing] = useState(false);

    function formatPrice(value: string) {
        const num = Number(value);
        return Number.isNaN(num) ? value : `${new Intl.NumberFormat('vi-VN').format(num)} ₫`;
    }

    function formatDate(dateStr: string) {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    return (
        <div
            className={`
        bg-white border rounded-2xl p-5 transition-all duration-200
        hover:shadow-md hover:border-[#d6382f]
        ${selected ? 'ring-2 ring-[#d6382f] border-[#d6382f]' : 'border-gray-200'}
      `}
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Checkbox + Order Info */}
                <div className="lg:col-span-3 flex items-start gap-4">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onToggleSelect}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-[#d6382f] focus:ring-[#d6382f] cursor-pointer"
                        aria-label={`Chọn đơn ${order.orderNumber}`}
                    />

                    <div className="flex-1 min-w-0">
                        <a
                            href={`/orders/${encodeURIComponent(order.id)}`}
                            className="font-bold text-gray-900 hover:text-[#d6382f] transition-colors block truncate"
                        >
                            {order.orderNumber}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                            {formatDate(order.createdAt)}
                        </p>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                            {order.type === 'RESIN' ? '🎨 Resin' : '🛒 Order'}
                        </span>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="lg:col-span-2">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center font-bold text-[#d6382f]">
                            {(order.user.name || order.user.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                                {order.user.name || 'Khách hàng'}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{order.user.email}</p>
                            {order.user.phone && (
                                <p className="text-xs text-gray-400 mt-0.5">{order.user.phone}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status & Payment */}
                <div className="lg:col-span-3">
                    {!isEditing ? (
                        <div className="space-y-2">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Trạng thái đơn:</p>
                                <StatusBadge status={order.status} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Thanh toán:</p>
                                <StatusBadge status={order.paymentStatus} />
                            </div>
                        </div>
                    ) : (
                        <form action={onUpdate} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Trạng thái</label>
                                <select
                                    name="status"
                                    defaultValue={order.status}
                                    className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d6382f]"
                                >
                                    {statuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </form>
                    )}
                </div>

                {/* Shipping */}
                <div className="lg:col-span-2">
                    {!isEditing ? (
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Vận chuyển:</p>
                            {order.trackingNumber ? (
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-gray-900">{order.trackingCarrier}</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            {order.trackingNumber}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(order.trackingNumber!)}
                                            className="text-gray-400 hover:text-[#d6382f] text-xs"
                                            title="Copy tracking"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400">Chưa có tracking</span>
                            )}
                        </div>
                    ) : (
                        <form action={onUpdate} className="space-y-2">
                            <input
                                name="trackingCarrier"
                                defaultValue={order.trackingCarrier || ''}
                                placeholder="Đơn vị vận chuyển"
                                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d6382f]"
                            />
                            <input
                                name="trackingNumber"
                                defaultValue={order.trackingNumber || ''}
                                placeholder="Mã tracking"
                                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d6382f]"
                            />
                        </form>
                    )}
                </div>

                {/* Total + Actions */}
                <div className="lg:col-span-2 flex flex-col items-end justify-between">
                    <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Tổng tiền:</p>
                        <p className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                        {!isEditing ? (
                            <>
                                <a
                                    href={`/orders/${encodeURIComponent(order.id)}`}
                                    className="p-2 text-gray-600 hover:text-[#d6382f] hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Xem chi tiết"
                                >
                                    👁
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-gray-600 hover:text-[#d6382f] hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Chỉnh sửa"
                                >
                                    ✏️
                                </button>
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    disabled={deleting}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Xóa đơn"
                                >
                                    🗑️
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const forms = document.querySelectorAll('form');
                                        forms.forEach((form) => {
                                            if (form.parentElement?.parentElement?.parentElement === document.querySelector(`[data-order="${order.id}"]`)) {
                                                const formData = new FormData(form);
                                                onUpdate(formData);
                                            }
                                        });
                                        setIsEditing(false);
                                    }}
                                    className="px-3 py-1.5 bg-[#d6382f] text-white text-sm font-semibold rounded-lg hover:bg-[#b92720] transition-colors"
                                >
                                    💾 Lưu
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    ✕
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
