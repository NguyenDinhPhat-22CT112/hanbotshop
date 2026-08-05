// Shared types for Order Management
export type OrderType = 'ORDER' | 'RESIN';

export type OrderStatus =
    | 'WAITING_DEPOSIT'
    | 'DEPOSIT_PAID'
    | 'WAITING_SECOND_PAYMENT'
    | 'SECOND_PAYMENT_PAID'
    | 'SHIPPING'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'BLOCKED';

export type ResinStatus =
    | 'PENDING_CONFIRMATION'
    | 'CONFIRMED'
    | 'WAITING_PAYMENT'
    | 'PAID'
    | 'IN_PRODUCTION'
    | 'CASTING'
    | 'PAINTING'
    | 'QC'
    | 'PACKAGING'
    | 'READY_TO_SHIP'
    | 'SHIPPED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'BLOCKED';

export type PaymentStatus =
    | 'UNPAID'
    | 'PARTIALLY_PAID'
    | 'DEPOSIT_PAID'
    | 'PAID';

export interface BaseOrder {
    id: string;
    orderNumber: string;
    type: OrderType;
    status: OrderStatus | ResinStatus;
    paymentStatus: PaymentStatus;
    total: string;
    trackingNumber: string | null;
    trackingCarrier: string | null;
    createdAt: string;
    user: {
        email: string;
        name: string | null;
        phone: string | null;
    };
}

export interface OrderItem {
    id: string;
    productName: string;
    quantity: number;
    price: string;
}

export interface OrderDetail extends BaseOrder {
    items: OrderItem[];
    shippingAddress?: string;
    notes?: string;
}

export interface ResinOrder extends OrderDetail {
    characterName?: string;
    scale?: string;
    version?: string;
    material?: string;
    estimatedRelease?: string;
    expectedShipDate?: string;
    depositAmount?: string;
    remainingAmount?: string;
    timeline?: ResinTimelineItem[];
}

export interface ResinTimelineItem {
    stage: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    startDate?: string;
    completedDate?: string;
}

export interface OrderFilters {
    type: OrderType;
    q: string;
    status: string;
    paymentStatus: string;
    shippingStatus: string;
    dateFrom: string;
    dateTo: string;
    page: number;
    pageSize: number;
    [key: string]: string | number | undefined;
}
