'use client';

interface BulkActionsProps {
    selectedCount: number;
    onClearSelection: () => void;
    onBulkDelete: () => void;
    onBulkExport: () => void;
    deleting: boolean;
}

export function BulkActions({
    selectedCount,
    onClearSelection,
    onBulkDelete,
    onBulkExport,
    deleting
}: BulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#d6382f] rounded-full flex items-center justify-center font-bold text-sm">
                        {selectedCount}
                    </div>
                    <span className="font-semibold">
                        Đã chọn {selectedCount} đơn hàng
                    </span>
                </div>

                <div className="h-6 w-px bg-gray-700" />

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBulkExport}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
                    >
                        📊 Export Excel
                    </button>

                    <button
                        type="button"
                        onClick={onBulkDelete}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {deleting ? '⏳ Đang xóa...' : '🗑️ Xóa đã chọn'}
                    </button>

                    <button
                        type="button"
                        onClick={onClearSelection}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-sm transition-colors"
                    >
                        ✕ Bỏ chọn
                    </button>
                </div>
            </div>
        </div>
    );
}
