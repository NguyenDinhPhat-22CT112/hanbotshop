'use client';

// Keep browser authentication same-origin. Next.js proxies this path to the
// internal API so the HttpOnly session cookie survives navigation and reloads.
const apiUrl = '/api/v1';

export type AuthMode = 'login' | 'register';

export type AuthUser = {
  id?: string;
  email: string;
  name?: string | null;
  phone: string | null;
  role: string;
};

export function clearToken() {
  window.localStorage.removeItem('hanbotorder_token');
  void fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include', keepalive: true });
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...options.headers
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.message ?? payload?.error?.message ?? 'Yêu cầu không thành công.', response.status);
  }

  return payload as T;
}

export async function authenticate(mode: AuthMode, body: Record<string, string>) {
  return apiFetch<{ tokenType: 'Cookie'; user: AuthUser }>(`/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function requestPasswordReset(email: string) {
  return apiFetch<{ success: boolean; message: string; resetUrl?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function resetPassword(token: string, password: string) {
  return apiFetch<{ tokenType: 'Cookie'; user: AuthUser }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password })
  });
}

export async function getCurrentUser() {
  return apiFetch<{ user: AuthUser }>('/auth/me');
}

export type AccountNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: { orderId?: string; orderNumber?: string } | null;
  readAt: string | null;
  createdAt: string;
};

export function getNotifications(unreadOnly = false) {
  return apiFetch<{ data: AccountNotification[]; unreadCount: number }>(
    `/notifications${unreadOnly ? '?unreadOnly=true' : ''}`
  );
}

export function markNotificationRead(id: string) {
  return apiFetch<{ success: true }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}

export type Address = {
  id: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
};

export async function getAddresses() {
  const payload = await apiFetch<{ data: Address[] }>('/users/me/addresses');

  return payload.data;
}

export async function addCartItem(productId: string, variantId: string | null = null, quantity = 1) {
  return apiFetch<CartResponse & { itemAdded: boolean }>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, variantId, quantity })
  });
}

export type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  product: {
    name: string;
    imageUrl?: string | null;
    paymentRequirement: 'FULL' | 'DEPOSIT';
    depositPercent: number;
  };
  variant?: { name: string } | null;
};

export type CartResponse = {
  items: CartItem[];
  subtotal: string;
};

export async function getCart() {
  return apiFetch<CartResponse>('/cart');
}

export async function mergeCartItems(items: Array<{ productId: string; variantId: string | null; quantity: number }>) {
  return apiFetch<CartResponse & { mergedCount: number; skippedCount: number }>('/cart/merge', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

export async function updateCartItem(itemId: string, quantity: number) {
  return apiFetch<Awaited<ReturnType<typeof getCart>>>(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity })
  });
}

export async function removeCartItem(itemId: string) {
  return apiFetch<Awaited<ReturnType<typeof getCart>>>(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE'
  });
}

export async function checkout(body: Record<string, unknown>) {
  return apiFetch<{ id: string; orderNumber: string }>('/checkout', {
    method: 'POST',
    headers: {
      'Idempotency-Key': createIdempotencyKey()
    },
    body: JSON.stringify(body)
  });
}

export async function createPaymentSession(orderId: string) {
  return apiFetch<{ checkoutUrl: string; payment: { id: string; status: string; amount: string } }>('/payments/checkout-session', {
    method: 'POST',
    headers: {
      'Idempotency-Key': createIdempotencyKey()
    },
    body: JSON.stringify({ orderId })
  });
}

export type BankTransferPayment = {
  id: string;
  provider: string;
  providerReference: string | null;
  amount: string;
  status: string;
  payload?: {
    bankCode?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    transferContent?: string;
    instructions?: string;
  } | null;
  order: { id: string; orderNumber: string; total: string; paymentStatus: string };
};

export function getPayment(id: string) {
  return apiFetch<BankTransferPayment>(`/payments/${encodeURIComponent(id)}`);
}

type ApiListResponse<T> = {
  data: T[];
};

type ApiTimelineItem = {
  type: string;
  actorId?: string | null;
  paymentId?: string;
  payload?: unknown;
  createdAt: string;
};

type ApiOrderItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  productSnapshot?: {
    name?: string;
    studio?: string | null;
  } | null;
};

export type AccountOrder = {
  id: string;
  number: string;
  status: string;
  payment: string;
  total: string;
  depositRequired: string;
  paidAmount: string;
  remainingAmount: string;
  placedAt: string;
  estimate: string;
  contact: string;
  shippingAddress: string;
  items: {
    name: string;
    quantity: number;
    price: string;
  }[];
  timeline: {
    title: string;
    note: string;
    time: string;
    done: boolean;
  }[];
};

type ApiOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  depositRequired: string;
  paidAmount: string;
  createdAt: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  shippingAddress: unknown;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  items: ApiOrderItem[];
};

export async function getAccountOrders() {
  const payload = await apiFetch<ApiListResponse<ApiOrder>>('/orders?pageSize=100');

  return payload.data.map((order) => mapOrder(order));
}

export async function getAccountOrder(id: string) {
  const [payload, timeline] = await Promise.all([
    apiFetch<ApiOrder>(`/orders/${encodeURIComponent(id)}`),
    getOrderTimeline(id).catch(() => [])
  ]);

  return mapOrder(payload, timeline);
}

export async function getOrderTimeline(id: string) {
  const payload = await apiFetch<ApiListResponse<ApiTimelineItem>>(`/orders/${encodeURIComponent(id)}/timeline`);

  return payload.data;
}

export async function cancelOrder(id: string) {
  const payload = await apiFetch<ApiOrder>(`/orders/${encodeURIComponent(id)}/cancel`, {
    method: 'POST'
  });

  return mapOrder(payload);
}

function mapOrder(order: ApiOrder, timeline?: ApiTimelineItem[]): AccountOrder {
  const trackingCopy = order.trackingNumber
    ? `${order.trackingCarrier ?? 'Đơn vị vận chuyển'}: ${order.trackingNumber}`
    : 'Shop sẽ cập nhật sau khi đơn sẵn sàng giao.';
  const mappedTimeline = timeline?.length ? mapTimeline(timeline, order, trackingCopy) : fallbackTimeline(order, trackingCopy);

  return {
    id: order.id,
    number: order.orderNumber,
    status: order.status,
    payment: order.paymentStatus,
    total: formatVnd(order.total),
    depositRequired: formatVnd(order.depositRequired),
    paidAmount: formatVnd(order.paidAmount),
    remainingAmount: formatVnd(String(Math.max(0, Number(order.total) - Number(order.paidAmount)))),
    placedAt: formatDate(order.createdAt),
    estimate: estimateForStatus(order.status, order.paymentStatus),
    contact: [order.recipientName, order.recipientPhone].filter(Boolean).join(' / ') || 'Chưa có thông tin liên hệ',
    shippingAddress: formatAddress(order.shippingAddress),
    items: order.items.map((item) => ({
      name: item.productSnapshot?.name ?? 'Sản phẩm',
      quantity: item.quantity,
      price: formatVnd(item.totalPrice)
    })),
    timeline: mappedTimeline
  };
}

function fallbackTimeline(order: ApiOrder, trackingCopy: string): AccountOrder['timeline'] {
  return [
    {
      title: 'Đã tạo đơn',
      note: 'Shop đã nhận thông tin đặt hàng.',
      time: formatDateTime(order.createdAt),
      done: true
    },
    {
      title: 'Xác nhận và thanh toán',
      note: order.paymentStatus === 'PAID' ? 'Thanh toán đã được ghi nhận.' : 'Shop sẽ xác nhận đơn và hướng dẫn thanh toán.',
      time: order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Đang xử lý',
      done: ['CONFIRMED', 'WAITING_PAYMENT', 'PAID', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'].includes(order.status)
    },
    {
      title: 'Sản xuất / chuẩn bị hàng',
      note: 'Tiến độ sẽ được cập nhật khi đơn chuyển sang giai đoạn xử lý.',
      time: ['IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'].includes(order.status) ? 'Đang cập nhật' : 'Sắp tới',
      done: ['IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED'].includes(order.status)
    },
    {
      title: 'Giao hàng',
      note: trackingCopy,
      time: order.status === 'SHIPPED' || order.status === 'COMPLETED' ? 'Đang giao' : 'Sắp tới',
      done: order.status === 'SHIPPED' || order.status === 'COMPLETED'
    }
  ];
}

function mapTimeline(timeline: ApiTimelineItem[], order: ApiOrder, trackingCopy: string): AccountOrder['timeline'] {
  const mapped = timeline.map((item) => {
    const payload = item.payload && typeof item.payload === 'object' ? (item.payload as Record<string, unknown>) : {};
    const after = typeof payload.after === 'string' ? payload.after : undefined;
    const type = after ?? item.type;

    return {
      title: timelineTitle(type),
      note: timelineNote(type, trackingCopy),
      time: formatDateTime(item.createdAt),
      done: true
    };
  });

  return mapped.length ? mapped : fallbackTimeline(order, trackingCopy);
}

function timelineTitle(type: string) {
  const titles: Record<string, string> = {
    ORDER_CREATED: 'Đã tạo đơn',
    STATUS_CHANGED: 'Cập nhật trạng thái',
    PAYMENT_STATUS_CHANGED: 'Cập nhật thanh toán',
    TRACKING_UPDATED: 'Cập nhật giao hàng',
    ORDER_CANCELLED: 'Đã hủy đơn',
    ADMIN_NOTE_ADDED: 'Shop thêm ghi chú',
    PAYMENT_NOTE_ADDED: 'Ghi nhận thanh toán',
    PAID: 'Đã thanh toán',
    PARTIALLY_PAID: 'Thanh toán một phần',
    IN_PRODUCTION: 'Đang sản xuất',
    READY_TO_SHIP: 'Sẵn sàng giao',
    SHIPPED: 'Đang giao hàng',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã hủy đơn'
  };

  return titles[type] ?? type;
}

function timelineNote(type: string, trackingCopy: string) {
  if (type === 'TRACKING_UPDATED' || type === 'SHIPPED') {
    return trackingCopy;
  }

  if (type === 'ORDER_CREATED') {
    return 'Shop đã nhận thông tin đặt hàng.';
  }

  if (type === 'ORDER_CANCELLED' || type === 'CANCELLED') {
    return 'Đơn hàng đã được hủy theo quy định.';
  }

  return 'Tiến độ đơn hàng đã được cập nhật.';
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatVnd(value: string) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  return `${new Intl.NumberFormat('vi-VN').format(numericValue)} VND`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(value));
}

function formatAddress(address: unknown) {
  if (!address || typeof address !== 'object') {
    return 'Chưa có địa chỉ';
  }

  const data = address as Record<string, unknown>;

  return [data.line1, data.line2, data.city, data.province, data.postalCode].filter(Boolean).join(', ');
}

function estimateForStatus(status: string, paymentStatus: string) {
  if (status === 'CANCELLED') {
    return 'Đơn đã hủy';
  }

  if (status === 'COMPLETED') {
    return 'Đơn đã hoàn tất';
  }

  if (status === 'SHIPPED') {
    return 'Đơn đang được giao';
  }

  if (paymentStatus !== 'PAID') {
    return 'Chờ xác nhận hoặc thanh toán';
  }

  return 'Shop đang xử lý đơn hàng';
}
