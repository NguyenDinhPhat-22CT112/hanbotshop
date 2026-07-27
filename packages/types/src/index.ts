export type UserRole = 'CUSTOMER' | 'ADMIN';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type ProductAvailability =
  | 'PRE_ORDER'
  | 'ORDER'
  | 'IN_STOCK'
  | 'SALE'
  | 'CONTACT';

export type OrderStatus =
  | 'WAITING_DEPOSIT'
  | 'DEPOSIT_PAID'
  | 'WAITING_SECOND_PAYMENT'
  | 'SECOND_PAYMENT_PAID'
  | 'SHIPPING'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'WAITING_PAYMENT'
  | 'PAID'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'BLOCKED';

export type OrderType = 'ORDER' | 'RESIN';

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
};
