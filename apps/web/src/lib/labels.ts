const labels: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  ADMIN: 'Quản trị viên',
  BLOCKED: 'Đang vướng xử lý',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất',
  CONFIRMED: 'Đã xác nhận',
  CONTACT: 'Liên hệ',
  CUSTOMER: 'Khách hàng',
  DRAFT: 'Bản nháp',
  IN_PRODUCTION: 'Đang sản xuất',
  IN_STOCK: 'Có sẵn',
  ORDER: 'Đặt hàng',
  PAID: 'Đã thanh toán',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  PRE_ORDER: 'Đặt trước',
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
