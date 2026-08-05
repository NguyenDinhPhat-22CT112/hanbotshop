'use client';

interface DepositInfoProps {
    total: string;
    depositAmount?: string;
    remainingAmount?: string;
    depositPaid: boolean;
    fullyPaid: boolean;
    onMarkDepositPaid?: () => void;
    onMarkFullyPaid?: () => void;
}

export function DepositInfo({
    total,
    depositAmount,
    remainingAmount,
    depositPaid,
    fullyPaid,
    onMarkDepositPaid,
    onMarkFullyPaid
}: DepositInfoProps) {
    function formatPrice(value: string) {
        const num = Number(value);
        return Number.isNaN(num) ? value : `${new Intl.NumberFormat('vi-VN').format(num)} ₫`;
    }

    const totalNum = Number(total);
    const depositNum = depositAmount ? Number(depositAmount) : totalNum * 0.3; // Default 30%
    const remainingNum = remainingAmount ? Number(remainingAmount) : totalNum - depositNum;
    const depositPercent = ((depositNum / totalNum) * 100).toFixed(0);
    const remainingPercent = ((remainingNum / totalNum) * 100).toFixed(0);

    return (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100">
            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                💰 Quản lý thanh toán cọc
            </h3>

            {/* Total */}
            <div className="mb-4 pb-4 border-b border-teal-200">
                <p className="text-sm text-gray-600 mb-1">Tổng giá trị đơn hàng:</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(String(totalNum))}</p>
            </div>

            {/* Deposit & Remaining Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Deposit */}
                <div className={`bg-white rounded-xl p-4 border-2 ${depositPaid ? 'border-green-300' : 'border-yellow-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-700">Tiền cọc ({depositPercent}%)</p>
                        {depositPaid ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                ✓ Đã thanh toán
                            </span>
                        ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                                ⏱ Chưa thanh toán
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatPrice(String(depositNum))}</p>
                </div>

                {/* Remaining */}
                <div className={`bg-white rounded-xl p-4 border-2 ${fullyPaid ? 'border-green-300' : 'border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-700">Còn lại ({remainingPercent}%)</p>
                        {fullyPaid ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                ✓ Đã thanh toán
                            </span>
                        ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                                ○ Chưa thanh toán
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-bold text-gray-900">{formatPrice(String(remainingNum))}</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-5">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                        style={{ width: fullyPaid ? '100%' : depositPaid ? `${depositPercent}%` : '0%' }}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                    {fullyPaid
                        ? 'Đã thanh toán toàn bộ'
                        : depositPaid
                            ? `Đã thanh toán ${depositPercent}% (cọc)`
                            : 'Chưa thanh toán'}
                </p>
            </div>

            {/* Action Buttons */}
            {!fullyPaid && (
                <div className="flex flex-col gap-2">
                    {!depositPaid && onMarkDepositPaid && (
                        <button
                            type="button"
                            onClick={onMarkDepositPaid}
                            className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            ✓ Đánh dấu đã thanh toán cọc
                        </button>
                    )}
                    {depositPaid && onMarkFullyPaid && (
                        <button
                            type="button"
                            onClick={onMarkFullyPaid}
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            ✓ Đánh dấu đã thanh toán toàn bộ
                        </button>
                    )}
                </div>
            )}

            {fullyPaid && (
                <div className="text-center py-3 bg-green-100 text-green-800 rounded-xl font-semibold">
                    🎉 Đã thanh toán đầy đủ
                </div>
            )}
        </div>
    );
}
