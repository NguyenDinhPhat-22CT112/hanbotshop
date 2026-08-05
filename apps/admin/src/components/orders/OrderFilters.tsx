'use client';

import { ORDER_STATUSES, RESIN_STATUSES, STATUS_LABELS } from './constants';
import type { OrderType, OrderFilters as Filters } from './types';

interface OrderFiltersProps {
    filters: Filters;
    onApplyFilters: (formData: FormData) => void;
    onReset: () => void;
}

export function OrderFilters({ filters, onApplyFilters, onReset }: OrderFiltersProps) {
    const statuses = filters.type === 'ORDER' ? ORDER_STATUSES : RESIN_STATUSES;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-base font-bold text-gray-900">Bộ lọc đơn hàng</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Tìm kiếm và lọc đơn hàng theo tiêu chí</p>
                </div>
            </div>

            <form
                className="grid grid-cols-1 lg:grid-cols-6 gap-4"
                action={onApplyFilters}
            >
                <input type="hidden" name="type" value={filters.type} />

                {/* Search */}
                <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        🔍 Tìm kiếm
                    </label>
                    <input
                        name="q"
                        type="text"
                        defaultValue={filters.q}
                        placeholder="Mã đơn, khách hàng, email, số điện thoại..."
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d6382f] focus:border-transparent transition-all"
                    />
                </div>

                {/* Status */}
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        📊 Trạng thái
                    </label>
                    <select
                        name="status"
                        defaultValue={filters.status}
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d6382f] focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Tất cả trạng thái</option>
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Payment Status */}
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        💳 Thanh toán
                    </label>
                    <select
                        name="paymentStatus"
                        defaultValue={filters.paymentStatus}
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d6382f] focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Tất cả</option>
                        <option value="UNPAID">Chưa thanh toán</option>
                        <option value="PARTIALLY_PAID">Thanh toán một phần</option>
                        <option value="DEPOSIT_PAID">Đã cọc</option>
                        <option value="PAID">Đã thanh toán</option>
                    </select>
                </div>

                {/* Shipping Status */}
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        🚚 Vận chuyển
                    </label>
                    <select
                        name="shippingStatus"
                        defaultValue={filters.shippingStatus}
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d6382f] focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Tất cả</option>
                        <option value="NO_TRACKING">Chưa có tracking</option>
                        <option value="HAS_TRACKING">Đã có tracking</option>
                    </select>
                </div>

                {/* Page Size */}
                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        📄 Hiển thị
                    </label>
                    <select
                        name="pageSize"
                        defaultValue={filters.pageSize}
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d6382f] focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                        <option value="10">10 đơn/trang</option>
                        <option value="20">20 đơn/trang</option>
                        <option value="50">50 đơn/trang</option>
                        <option value="100">100 đơn/trang</option>
                    </select>
                </div>

                {/* Actions */}
                <div className="lg:col-span-6 flex items-center gap-3 pt-2">
                    <button
                        type="submit"
                        className="px-6 h-11 bg-[#d6382f] text-white font-bold rounded-xl hover:bg-[#b92720] transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                        🔍 Lọc kết quả
                    </button>
                    <button
                        type="button"
                        onClick={onReset}
                        className="px-6 h-11 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
                    >
                        ↻ Đặt lại
                    </button>
                </div>
            </form>
        </div>
    );
}
