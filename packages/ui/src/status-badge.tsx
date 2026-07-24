import type { ProductAvailability } from '@hanbotorder/types';

const availabilityLabels: Record<ProductAvailability, string> = {
  PRE_ORDER: 'Đặt trước',
  ORDER: 'Đặt hàng',
  IN_STOCK: 'Có sẵn',
  SALE: 'Giảm giá',
  CONTACT: 'Liên hệ'
};

type StatusBadgeProps = {
  status: ProductAvailability;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${status.toLowerCase()}`}>{availabilityLabels[status]}</span>;
}
