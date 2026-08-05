'use client';

interface OrderToolbarProps {
    totalOrders?: number;
    onRefresh: () => void;
    onExport: () => void;
    refreshing?: boolean;
}

export function OrderToolbar({ totalOrders, onRefresh, onExport, refreshing }: OrderToolbarProps) {
    return (
        <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    📦 Order Management
                    {totalOrders !== undefined && (
                        <span className="px-3 py-1 bg-red-50 text-[#d6382f] text-base font-bold rounded-full">
                            {totalOrders}
                        </span>
                    )}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Quản lý toàn bộ đơn hàng Order và Resin
                </p>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="px-4 h-11 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                >
                    <span className={refreshing ? 'animate-spin' : ''}>↻</span>
                    {refreshing ? 'Đang tải...' : 'Refresh'}
                </button>

                <button
                    type="button"
                    onClick={onExport}
                    className="px-4 h-11 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                >
                    📥 Export Excel
                </button>
            </div>
        </div>
    );
}
