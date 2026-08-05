'use client';

interface PaginationMeta {
    total: number;
    page: number;
    pageSize: number;
    totalPages?: number; // Make optional
    pageCount?: number;  // Support ListMeta format
}

interface ModernPaginationProps {
    meta: PaginationMeta | null;
    onPageChange: (page: number) => void;
}

export function ModernPagination({ meta, onPageChange }: ModernPaginationProps) {
    if (!meta) return null;

    // Support both totalPages and pageCount
    const totalPages = meta.totalPages || meta.pageCount || 1;
    if (totalPages <= 1) return null;

    const { page, pageSize, total } = meta;
    const startIndex = (page - 1) * pageSize + 1;
    const endIndex = Math.min(page * pageSize, total);

    function getPageNumbers() {
        const pages: (number | string)[] = [];
        const maxVisible = 7;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (page <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Info */}
                <div className="text-sm text-gray-600 font-medium">
                    Hiển thị <span className="font-bold text-gray-900">{startIndex}</span> đến{' '}
                    <span className="font-bold text-gray-900">{endIndex}</span> trong tổng số{' '}
                    <span className="font-bold text-gray-900">{total}</span> đơn hàng
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                    {/* Previous */}
                    <button
                        type="button"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        aria-label="Trang trước"
                    >
                        ‹
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((pageNum, index) => {
                        if (pageNum === '...') {
                            return (
                                <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                                    …
                                </span>
                            );
                        }

                        const pageNumber = pageNum as number;
                        const isActive = pageNumber === page;

                        return (
                            <button
                                key={pageNumber}
                                type="button"
                                onClick={() => onPageChange(pageNumber)}
                                className={`
                  min-w-[2.5rem] h-10 px-3 rounded-xl font-bold transition-all
                  ${isActive
                                        ? 'bg-[#d6382f] text-white shadow-md scale-105'
                                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }
                `}
                            >
                                {pageNumber}
                            </button>
                        );
                    })}

                    {/* Next */}
                    <button
                        type="button"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        aria-label="Trang sau"
                    >
                        ›
                    </button>
                </div>
            </div>
        </div>
    );
}
