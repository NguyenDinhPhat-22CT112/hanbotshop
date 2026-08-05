'use client';

import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { ResinTimeline } from './ResinTimeline';
import { DepositInfo } from './DepositInfo';
import type { ResinOrder } from './types';

interface ResinCardProps {
    order: ResinOrder;
    selected: boolean;
    statuses: readonly string[];
    onToggleSelect: () => void;
    onUpdate: (formData: FormData) => void;
    onDelete: () => void;
    onMarkDepositPaid: () => void;
    onMarkFullyPaid: () => void;
    deleting: boolean;
}

export function ResinCard({
    order,
    selected,
    statuses,
    onToggleSelect,
    onUpdate,
    onDelete,
    onMarkDepositPaid,
    onMarkFullyPaid,
    deleting
}: ResinCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showDepositInfo, setShowDepositInfo] = useState(false);

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

    const depositPaid = order.paymentStatus === 'DEPOSIT_PAID' || order.paymentStatus === 'PAID';
    const fullyPaid = order.paymentStatus === 'PAID';

    return (
        <div
            className={`
        bg-gradient-to-br from-purple-50 to-pink-50 border-2 rounded-2xl p-5 transition-all duration-200
        hover:shadow-lg hover:border-purple-400
        ${selected ? 'ring-2 ring-purple-500 border-purple-500' : 'border-purple-200'}
      `}
        >
            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Checkbox + Order Info */}
                <div className="lg:col-span-3 flex items-start gap-4">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onToggleSelect}
                        className="mt-1 w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        aria-label={`Chọn đơn ${order.orderNumber}`}
                    />

                    <div className="flex-1 min-w-0">
                        <a
                            href={`/orders/${encodeURIComponent(order.id)}`}
                            className="font-bold text-gray-900 hover:text-purple-600 transition-colors block truncate"
                        >
                            {order.orderNumber}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                            {formatDate(order.createdAt)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="inline-block px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded">
                                🎨 RESIN ORDER
                            </span>
                        </div>

                        {/* Resin Info */}
                        {order.characterName && (
                            <div className="mt-3 space-y-1">
                                <p className="text-xs font-semibold text-purple-700">
                                    🎭 {order.characterName}
                                </p>
                                {order.scale && (
                                    <p className="text-xs text-gray-600">📏 Scale: {order.scale}</p>
                                )}
                                {order.version && (
                                    <p className="text-xs text-gray-600">🔖 Ver: {order.version}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Info */}
                <div className="lg:col-span-2">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center font-bold text-purple-600">
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
                                <p className="text-xs text-gray-500 mb-1">Trạng thái sản xuất:</p>
                                <StatusBadge status={order.status} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Thanh toán:</p>
                                <StatusBadge status={order.paymentStatus} />
                            </div>
                            {order.material && (
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Chất liệu:</p>
                                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                        {order.material}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form action={onUpdate} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Trạng thái</label>
                                <select
                                    name="status"
                                    defaultValue={order.status}
                                    className="w-full h-9 px-3 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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

                {/* Shipping & Dates */}
                <div className="lg:col-span-2">
                    {!isEditing ? (
                        <div className="space-y-2">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Vận chuyển:</p>
                                {order.trackingNumber ? (
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-gray-900">{order.trackingCarrier}</p>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs bg-white px-2 py-1 rounded border border-purple-200">
                                                {order.trackingNumber}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => navigator.clipboard.writeText(order.trackingNumber!)}
                                                className="text-purple-400 hover:text-purple-600 text-xs"
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
                            {order.expectedShipDate && (
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Dự kiến giao:</p>
                                    <p className="text-xs font-semibold text-purple-700">
                                        📅 {new Date(order.expectedShipDate).toLocaleDateString('vi-VN')}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form action={onUpdate} className="space-y-2">
                            <input
                                name="trackingCarrier"
                                defaultValue={order.trackingCarrier || ''}
                                placeholder="Đơn vị vận chuyển"
                                className="w-full h-9 px-3 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <input
                                name="trackingNumber"
                                defaultValue={order.trackingNumber || ''}
                                placeholder="Mã tracking"
                                className="w-full h-9 px-3 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </form>
                    )}
                </div>

                {/* Total + Actions */}
                <div className="lg:col-span-2 flex flex-col items-end justify-between">
                    <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Tổng giá trị:</p>
                        <p className="text-lg font-bold text-purple-700">{formatPrice(order.total)}</p>
                        {order.depositAmount && (
                            <p className="text-xs text-gray-500 mt-1">
                                Cọc: {formatPrice(order.depositAmount)}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                        {!isEditing ? (
                            <>
                                <a
                                    href={`/orders/${encodeURIComponent(order.id)}`}
                                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                    title="Xem chi tiết"
                                >
                                    👁
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
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
                                            const formData = new FormData(form);
                                            onUpdate(formData);
                                        });
                                        setIsEditing(false);
                                    }}
                                    className="px-3 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
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

            {/* Quick Actions Row */}
            <div className="mt-4 pt-4 border-t border-purple-200 flex items-center gap-3 flex-wrap">
                <button
                    type="button"
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 font-semibold text-sm rounded-lg hover:bg-purple-50 transition-all flex items-center gap-2"
                >
                    ⏱️ Timeline sản xuất
                    <span className="text-xs">{showTimeline ? '▲' : '▼'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setShowDepositInfo(!showDepositInfo)}
                    className="px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 font-semibold text-sm rounded-lg hover:bg-purple-50 transition-all flex items-center gap-2"
                >
                    💰 Quản lý cọc
                    <span className="text-xs">{showDepositInfo ? '▲' : '▼'}</span>
                </button>

                {order.estimatedRelease && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-2 bg-purple-100 rounded-lg">
                        <span className="text-xs font-semibold text-purple-700">
                            🎯 Release: {new Date(order.estimatedRelease).toLocaleDateString('vi-VN')}
                        </span>
                    </div>
                )}
            </div>

            {/* Timeline Section */}
            {showTimeline && order.timeline && (
                <div className="mt-5 pt-5 border-t border-purple-200">
                    <ResinTimeline timeline={order.timeline} currentStatus={order.status} />
                </div>
            )}

            {/* Deposit Info Section */}
            {showDepositInfo && (
                <div className="mt-5 pt-5 border-t border-purple-200">
                    <DepositInfo
                        total={order.total}
                        depositAmount={order.depositAmount}
                        remainingAmount={order.remainingAmount}
                        depositPaid={depositPaid}
                        fullyPaid={fullyPaid}
                        onMarkDepositPaid={onMarkDepositPaid}
                        onMarkFullyPaid={onMarkFullyPaid}
                    />
                </div>
            )}
        </div>
    );
}
