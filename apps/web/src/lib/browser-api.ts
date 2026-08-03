'use client';

// Keep browser authentication same-origin. Next.js proxies this path to the
// internal API so the HttpOnly session cookie survives navigation and reloads.
const apiUrl = '/api/v1';
export const authSessionChangedEvent = 'hanbotorder:auth-session-changed';

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
  // Check if admin cookie exists to set proper scope header
  const hasAdminCookie = document.cookie.includes('hanbotorder_admin_session=');

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      // Set admin scope if admin cookie exists (allows admin to use customer web)
      ...(hasAdminCookie ? { 'x-hanbotorder-session-scope': 'admin' } : {}),
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

export function notifyAuthSessionChanged() {
  window.dispatchEvent(new Event(authSessionChangedEvent));
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

export async function addCartItem(
  productId: string,
  variantId: string | null = null,
  quantity = 1,
  paymentRequirement: 'FULL' | 'DEPOSIT' = 'FULL'
) {
  return apiFetch<CartResponse & { itemAdded: boolean }>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, variantId, quantity, paymentRequirement })
  });
}

export type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  paymentRequirement: 'FULL' | 'DEPOSIT';
  product: {
    name: string;
    imageUrl?: string | null;
    orderType?: 'ORDER' | 'RESIN';
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
  return apiFetch<{
    orders: Array<{ id: string; orderNumber: string; type: 'ORDER' | 'RESIN' }>;
  }>('/checkout', {
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
    qrUrl?: string;
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
  type: 'ORDER' | 'RESIN';
  status: string;
  statusLabel: string;
  payment: string;
  paymentNotice: string;
  total: string;
  depositRequired: string;
  secondPaymentRequired: string;
  paidAmount: string;
  remainingAmount: string;
  codAmount: string;
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
  type: 'ORDER' | 'RESIN';
  status: string;
  paymentStatus: string;
  total: string;
  depositRequired: string;
  secondPaymentRequired: string;
  paidAmount: string;
  remainingAmount?: string;
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
    type: order.type,
    status: order.status,
    statusLabel: customerOrderStatus(order),
    payment: order.paymentStatus,
    paymentNotice: customerPaymentNotice(order),
    total: formatVnd(order.total),
    depositRequired: formatVnd(order.depositRequired),
    secondPaymentRequired: formatVnd(order.secondPaymentRequired),
    paidAmount: formatVnd(order.paidAmount),
    remainingAmount: formatVnd(order.remainingAmount ?? String(Math.max(0, Number(order.total) - Number(order.paidAmount)))),
    codAmount: formatVnd(order.status === 'SHIPPING' ? (order.remainingAmount ?? String(Math.max(0, Number(order.total) - Number(order.paidAmount)))) : '0'),
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

function customerOrderStatus(order: ApiOrder) {
  if (order.type === 'RESIN') {
    const resinLabels: Record<string, string> = {
      PENDING_CONFIRMATION: 'Shop đang xác nhận đơn Resin',
      CONFIRMED: 'Đơn Resin đã được xác nhận',
      WAITING_PAYMENT: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      IN_PRODUCTION: 'Đang sản xuất Resin',
      READY_TO_SHIP: 'Resin đã sẵn sàng giao',
      SHIPPED: 'Đang giao hàng',
      COMPLETED: 'Đã hoàn tất',
      CANCELLED: 'Đã hủy',
      BLOCKED: 'Đang tạm dừng xử lý'
    };

    return resinLabels[order.status] ?? order.status;
  }

  const orderLabels: Record<string, string> = {
    WAITING_DEPOSIT: 'Chờ thanh toán tiền cọc',
    DEPOSIT_PAID: 'Đã nhận tiền cọc – Đang chờ hàng về',
    WAITING_SECOND_PAYMENT: 'Hàng đã về – Chờ thanh toán đợt 2',
    SECOND_PAYMENT_PAID: 'Đã nhận thanh toán đợt 2 – Chuẩn bị giao hàng',
    SHIPPING: 'Đang vận chuyển',
    COMPLETED: 'Đã hoàn tất',
    CANCELLED: 'Đã hủy',
    BLOCKED: 'Đang tạm dừng xử lý'
  };

  return orderLabels[order.status] ?? order.status;
}

function customerPaymentNotice(order: ApiOrder) {
  const remaining = Math.max(0, Number(order.total) - Number(order.paidAmount));

  if (order.paymentStatus === 'PAID' || remaining === 0) {
    return 'Đã thanh toán đủ';
  }

  if (order.status === 'SHIPPING') {
    return `Còn ${formatVnd(String(remaining))} thanh toán khi nhận hàng`;
  }

  if (order.status === 'WAITING_DEPOSIT') {
    return `Cần thanh toán tiền cọc ${formatVnd(order.depositRequired)}`;
  }

  if (order.status === 'WAITING_SECOND_PAYMENT') {
    return `Cần thanh toán đợt 2 ${formatVnd(order.secondPaymentRequired)}`;
  }

  return `Đã thanh toán ${formatVnd(order.paidAmount)} · Còn ${formatVnd(String(remaining))}`;
}

function fallbackTimeline(order: ApiOrder, trackingCopy: string): AccountOrder['timeline'] {
  if (order.type === 'ORDER') {
    return orderPurchaseTimeline(order, trackingCopy);
  }

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

function orderPurchaseTimeline(order: ApiOrder, trackingCopy: string): AccountOrder['timeline'] {
  const reachedDeposit = ['DEPOSIT_PAID', 'WAITING_SECOND_PAYMENT', 'SECOND_PAYMENT_PAID', 'SHIPPING', 'COMPLETED'].includes(order.status);
  const reachedSecondPayment = ['SECOND_PAYMENT_PAID', 'SHIPPING', 'COMPLETED'].includes(order.status);
  const reachedShipping = ['SHIPPING', 'COMPLETED'].includes(order.status);

  return [
    {
      title: 'Đã tạo đơn Order',
      note: 'Thông tin thanh toán tiền cọc đã sẵn sàng.',
      time: formatDateTime(order.createdAt),
      done: true
    },
    {
      title: 'Thanh toán tiền cọc',
      note: reachedDeposit ? 'Shop đã xác nhận khoản tiền cọc.' : `Cần thanh toán ${formatVnd(order.depositRequired)}.`,
      time: reachedDeposit ? 'Đã xác nhận' : 'Đang chờ',
      done: reachedDeposit
    },
    {
      title: 'Hàng về và thanh toán đợt 2',
      note: order.status === 'WAITING_SECOND_PAYMENT'
        ? `Shop yêu cầu thanh toán ${formatVnd(order.secondPaymentRequired)}.`
        : 'Shop sẽ liên hệ khi hàng về.',
      time: reachedSecondPayment ? 'Đã xác nhận' : 'Sắp tới',
      done: reachedSecondPayment
    },
    {
      title: 'Vận chuyển',
      note: reachedShipping ? trackingCopy : 'Mã vận chuyển sẽ được cập nhật khi giao hàng.',
      time: reachedShipping ? 'Đang giao' : 'Sắp tới',
      done: reachedShipping
    },
    {
      title: 'Hoàn tất',
      note: 'Đơn hoàn tất sau khi giao hàng và thanh toán đủ.',
      time: order.status === 'COMPLETED' ? 'Hoàn tất' : 'Sắp tới',
      done: order.status === 'COMPLETED'
    }
  ];
}

function mapTimeline(timeline: ApiTimelineItem[], order: ApiOrder, trackingCopy: string): AccountOrder['timeline'] {
  // Lọc và gộp các events quan trọng, tránh trùng lặp
  const importantEvents: Array<{ type: string; time: string; status?: string }> = [];
  const seenStatuses = new Set<string>();

  for (const item of timeline) {
    const payload = item.payload && typeof item.payload === 'object' ? (item.payload as Record<string, unknown>) : {};

    // Với STATUS_CHANGED, lấy status mới
    if (item.type === 'STATUS_CHANGED' && typeof payload.after === 'string') {
      const newStatus = payload.after;
      if (!seenStatuses.has(newStatus)) {
        seenStatuses.add(newStatus);
        importantEvents.push({
          type: 'STATUS_CHANGED',
          status: newStatus,
          time: formatDateTime(item.createdAt)
        });
      }
      continue;
    }

    // Với PAYMENT_STATUS_CHANGED, chỉ hiển thị khi chuyển sang PAID
    if (item.type === 'PAYMENT_STATUS_CHANGED' && typeof payload.after === 'string') {
      if (payload.after === 'PAID' && !seenStatuses.has('PAYMENT_CONFIRMED')) {
        seenStatuses.add('PAYMENT_CONFIRMED');
        importantEvents.push({
          type: 'PAYMENT_CONFIRMED',
          time: formatDateTime(item.createdAt)
        });
      }
      continue;
    }

    // Chỉ hiển thị ORDER_CREATED một lần
    if (item.type === 'ORDER_CREATED' && !seenStatuses.has('ORDER_CREATED')) {
      seenStatuses.add('ORDER_CREATED');
      importantEvents.push({
        type: 'ORDER_CREATED',
        time: formatDateTime(item.createdAt)
      });
      continue;
    }

    // Bỏ qua các payment events khác (CHECKOUT_CREATED không cần hiển thị)
    if (item.type === 'CHECKOUT_CREATED' || item.type === 'WEBHOOK_RECEIVED') {
      continue;
    }
  }

  // Map sang timeline items
  const mapped = importantEvents.map((event) => ({
    title: timelineTitle(event.status ?? event.type),
    note: timelineNote(event.status ?? event.type, trackingCopy),
    time: event.time,
    done: true
  }));

  return mapped.length ? mapped : fallbackTimeline(order, trackingCopy);
}

function timelineTitle(type: string) {
  const titles: Record<string, string> = {
    ORDER_CREATED: 'Đã tạo đơn',
    PAYMENT_CONFIRMED: 'Đã xác nhận thanh toán',
    STATUS_CHANGED: 'Cập nhật trạng thái',
    PAYMENT_STATUS_CHANGED: 'Cập nhật thanh toán',
    TRACKING_UPDATED: 'Cập nhật giao hàng',
    ORDER_CANCELLED: 'Đã hủy đơn',
    ADMIN_NOTE_ADDED: 'Shop thêm ghi chú',
    PAYMENT_NOTE_ADDED: 'Ghi nhận thanh toán',
    WAITING_DEPOSIT: 'Chờ thanh toán tiền cọc',
    DEPOSIT_PAID: 'Đã nhận tiền cọc',
    WAITING_SECOND_PAYMENT: 'Chờ thanh toán đợt 2',
    SECOND_PAYMENT_PAID: 'Đã nhận thanh toán đợt 2',
    SHIPPING: 'Đang vận chuyển',
    PAID: 'Đã thanh toán đủ',
    PARTIALLY_PAID: 'Đã thanh toán một phần',
    PENDING_CONFIRMATION: 'Chờ shop xác nhận',
    CONFIRMED: 'Shop đã xác nhận đơn',
    WAITING_PAYMENT: 'Chờ thanh toán',
    IN_PRODUCTION: 'Đang sản xuất',
    READY_TO_SHIP: 'Sẵn sàng giao hàng',
    SHIPPED: 'Đã giao cho đơn vị vận chuyển',
    COMPLETED: 'Đơn hàng hoàn tất',
    CANCELLED: 'Đã hủy đơn',
    BLOCKED: 'Đơn hàng tạm giữ'
  };

  return titles[type] ?? type;
}

function timelineNote(type: string, trackingCopy: string) {
  const notes: Record<string, string> = {
    ORDER_CREATED: 'Shop đã nhận thông tin đặt hàng của bạn.',
    PAYMENT_CONFIRMED: 'Shop đã xác nhận khoản thanh toán của bạn.',
    PENDING_CONFIRMATION: 'Đơn hàng đang chờ shop xác nhận.',
    CONFIRMED: 'Shop đã xác nhận đơn hàng và sẽ liên hệ hướng dẫn thanh toán.',
    WAITING_DEPOSIT: 'Vui lòng thanh toán tiền cọc để shop bắt đầu xử lý đơn.',
    DEPOSIT_PAID: 'Shop đã nhận tiền cọc. Đơn hàng sẽ được xử lý khi hàng về.',
    WAITING_PAYMENT: 'Vui lòng thanh toán để shop bắt đầu xử lý đơn.',
    PAID: 'Thanh toán đã hoàn tất. Shop sẽ bắt đầu xử lý đơn hàng.',
    WAITING_SECOND_PAYMENT: 'Hàng đã về. Vui lòng thanh toán đợt 2 để shop chuẩn bị giao hàng.',
    SECOND_PAYMENT_PAID: 'Đã nhận thanh toán đợt 2. Shop sẽ chuẩn bị giao hàng.',
    IN_PRODUCTION: 'Đơn hàng đang được sản xuất/chuẩn bị.',
    READY_TO_SHIP: 'Đơn hàng đã sẵn sàng và chuẩn bị giao.',
    SHIPPED: trackingCopy || 'Đơn hàng đã được giao cho đơn vị vận chuyển.',
    SHIPPING: trackingCopy || 'Đơn hàng đang trên đường giao đến bạn.',
    COMPLETED: 'Đơn hàng đã hoàn tất. Cảm ơn bạn đã mua hàng!',
    CANCELLED: 'Đơn hàng đã được hủy.',
    BLOCKED: 'Đơn hàng tạm thời bị giữ. Shop sẽ liên hệ với bạn.'
  };

  if (type === 'TRACKING_UPDATED') {
    return trackingCopy || 'Thông tin vận chuyển đã được cập nhật.';
  }

  return notes[type] ?? 'Đơn hàng đã được cập nhật.';
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

  if (status === 'SHIPPED' || status === 'SHIPPING') {
    return 'Đơn đang được giao';
  }

  if (paymentStatus !== 'PAID') {
    return 'Chờ xác nhận hoặc thanh toán';
  }

  return 'Shop đang xử lý đơn hàng';
}
