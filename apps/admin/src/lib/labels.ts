const labels: Record<string, string> = {
  ARCHIVED: 'Đã lưu trữ',
  ACTIVE: 'Đang hoạt động',
  ADMIN: 'Quản trị viên',
  BLOCKED: 'Đang vướng',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất',
  CONFIRMED: 'Đã xác nhận',
  CONTACT: 'Liên hệ',
  CUSTOMER: 'Khách hàng',
  DISABLED: 'Đã khóa',
  DONE: 'Đã xong',
  DRAFT: 'Bản nháp',
  IN_PRODUCTION: 'Đang sản xuất',
  IN_STOCK: 'Có sẵn',
  ORDER: 'Đặt hàng',
  PAID: 'Đã thanh toán',
  PAINTING: 'Đang sơn',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  POST_PROCESSING: 'Hậu xử lý',
  PRE_ORDER: 'Đặt trước',
  PREPARING: 'Đang chuẩn bị',
  PRINTING: 'Đang in',
  QUALITY_CHECK: 'Kiểm tra chất lượng',
  QUEUED: 'Đang chờ',
  READY: 'Sẵn sàng',
  READY_TO_SHIP: 'Sẵn sàng giao',
  REFUNDED: 'Đã hoàn tiền',
  SALE: 'Giảm giá',
  SHIPPED: 'Đang giao',
  UNPAID: 'Chưa thanh toán',
  WAITING_PAYMENT: 'Chờ thanh toán'
};

export function labelOf(value: string) {
  return labels[value] ?? value;
}
