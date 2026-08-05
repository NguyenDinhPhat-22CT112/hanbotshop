// Order Management constants and labels
export const ORDER_STATUSES = [
    'WAITING_DEPOSIT',
    'DEPOSIT_PAID',
    'WAITING_SECOND_PAYMENT',
    'SECOND_PAYMENT_PAID',
    'SHIPPING',
    'COMPLETED',
    'CANCELLED',
    'BLOCKED'
] as const;

export const RESIN_STATUSES = [
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'WAITING_PAYMENT',
    'PAID',
    'IN_PRODUCTION',
    'CASTING',
    'PAINTING',
    'QC',
    'PACKAGING',
    'READY_TO_SHIP',
    'SHIPPED',
    'COMPLETED',
    'CANCELLED',
    'BLOCKED'
] as const;

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    // Common statuses
    PENDING_CONFIRMATION: { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
    CONFIRMED: { bg: '#EFF6FF', text: '#1E40AF', border: '#DBEAFE' },
    WAITING_DEPOSIT: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    DEPOSIT_PAID: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    WAITING_PAYMENT: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    WAITING_SECOND_PAYMENT: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    SECOND_PAYMENT_PAID: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    PAID: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },

    // Production stages
    IN_PRODUCTION: { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' },
    CASTING: { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' },
    PAINTING: { bg: '#DDD6FE', text: '#5B21B6', border: '#C4B5FD' },
    QC: { bg: '#FBCFE8', text: '#9F1239', border: '#F9A8D4' },
    PACKAGING: { bg: '#CCFBF1', text: '#115E59', border: '#99F6E4' },
    READY_TO_SHIP: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },

    // Shipping
    SHIPPING: { bg: '#FED7AA', text: '#9A3412', border: '#FDBA74' },
    SHIPPED: { bg: '#FED7AA', text: '#9A3412', border: '#FDBA74' },

    // Final states
    COMPLETED: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    CANCELLED: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
    BLOCKED: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },

    // Payment statuses
    UNPAID: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
    PARTIALLY_PAID: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' }
};

export const STATUS_LABELS: Record<string, string> = {
    // Order statuses
    WAITING_DEPOSIT: 'Chờ đặt cọc',
    DEPOSIT_PAID: 'Đã đặt cọc',
    WAITING_SECOND_PAYMENT: 'Chờ thanh toán còn lại',
    SECOND_PAYMENT_PAID: 'Đã thanh toán đủ',

    // Resin statuses
    PENDING_CONFIRMATION: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    WAITING_PAYMENT: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    IN_PRODUCTION: 'Đang sản xuất',
    CASTING: 'Đang đúc',
    PAINTING: 'Đang sơn',
    QC: 'Kiểm tra chất lượng',
    PACKAGING: 'Đóng gói',
    READY_TO_SHIP: 'Sẵn sàng giao hàng',

    // Common
    SHIPPING: 'Đang giao hàng',
    SHIPPED: 'Đã giao',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
    BLOCKED: 'Đã khóa',

    // Payment
    UNPAID: 'Chưa thanh toán',
    PARTIALLY_PAID: 'Thanh toán một phần',
};

export const RESIN_TIMELINE_STAGES = [
    { key: 'ORDER_CREATED', label: 'Đơn hàng tạo', icon: '📝' },
    { key: 'DEPOSIT_PAID', label: 'Đã cọc', icon: '💰' },
    { key: 'CONFIRMED', label: 'Xác nhận', icon: '✓' },
    { key: 'IN_PRODUCTION', label: 'Bắt đầu sản xuất', icon: '🔨' },
    { key: 'CASTING', label: 'Đúc khuôn', icon: '🎭' },
    { key: 'PAINTING', label: 'Sơn màu', icon: '🎨' },
    { key: 'QC', label: 'Kiểm tra', icon: '🔍' },
    { key: 'PACKAGING', label: 'Đóng gói', icon: '📦' },
    { key: 'SHIPPING', label: 'Vận chuyển', icon: '🚚' },
    { key: 'COMPLETED', label: 'Hoàn thành', icon: '🎉' }
];
