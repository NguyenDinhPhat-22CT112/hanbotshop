'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { checkout, createPaymentSession, getAddresses, getCart, type Address } from '../lib/browser-api';
import { calculateDepositRequired, formatVnd } from '../lib/checkout-utils';
import { PaymentModal } from './bank-transfer-payment';

type CartState = Awaited<ReturnType<typeof getCart>>;

type CheckoutFields = {
  recipientName: string;
  recipientPhone: string;
  line1: string;
  city: string;
  province: string;
};

function fieldsFromAddress(address: Address): CheckoutFields {
  return {
    recipientName: address.recipient,
    recipientPhone: address.phone,
    line1: [address.line1, address.line2].filter(Boolean).join(', '),
    city: address.city,
    province: address.province ?? ''
  };
}

export function CheckoutForm() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cart, setCart] = useState<CartState | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [fields, setFields] = useState<CheckoutFields>({
    recipientName: '',
    recipientPhone: '',
    line1: '',
    city: '',
    province: ''
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    Promise.all([getAddresses(), getCart()])
      .then(([addressPayload, cartPayload]) => {
        setAddresses(addressPayload);
        setCart(cartPayload);
        const defaultAddress = addressPayload.find((address) => address.isDefault) ?? addressPayload[0];

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setFields(fieldsFromAddress(defaultAddress));
        }
      })
      .catch(() => {
        setMessage('Chưa tải được thông tin checkout. Vui lòng thử tải lại trang.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  function updateField(key: keyof CheckoutFields, value: string) {
    setSelectedAddressId('');
    setFields((current) => ({ ...current, [key]: value }));
  }

  function selectAddress(id: string) {
    setSelectedAddressId(id);
    const address = addresses.find((item) => item.id === id);

    if (address) {
      setFields(fieldsFromAddress(address));
      return;
    }

    setFields({
      recipientName: '',
      recipientPhone: '',
      line1: '',
      city: '',
      province: ''
    });
  }

  async function submit() {
    if (isSubmitting || !cart?.items.length) {
      return;
    }

    setIsSubmitting(true);
    setMessage('Đang tạo đơn hàng...');

    try {
      const result = await checkout({
        recipientName: fields.recipientName,
        recipientPhone: fields.recipientPhone,
        shippingAddress: {
          line1: fields.line1,
          city: fields.city,
          province: fields.province,
          countryCode: 'VN'
        }
      });
      const orderPurchase = result.orders.find((order) => order.type === 'ORDER');
      const createdNumbers = result.orders.map((order) => order.orderNumber).join(', ');

      if (orderPurchase) {
        setMessage(`Đã tách và tạo đơn: ${createdNumbers}. Bảng thanh toán tiền cọc đã sẵn sàng.`);
        const paymentSession = await createPaymentSession(orderPurchase.id);
        setCreatedOrderId(orderPurchase.id);
        setPaymentId(paymentSession.payment.id);
        return;
      }

      const resinOrder = result.orders[0];
      if (!resinOrder) {
        throw new Error('Hệ thống chưa trả về đơn hàng vừa tạo.');
      }

      setMessage(`Đã tạo đơn Resin: ${resinOrder.orderNumber}. Đang chuyển sang chi tiết đơn...`);
      router.push(`/account/orders/${encodeURIComponent(resinOrder.id)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tạo được đơn hàng.');
      setIsSubmitting(false);
    }
  }

  const depositRequired = calculateDepositRequired(cart?.items ?? []);

  return (
    <>
      <div className="checkout-layout">
        <form className="request-form checkout-address-form" action={submit} aria-busy={isSubmitting || isLoading}>
      <header className="checkout-section-heading">
        <h2>Địa chỉ nhận hàng</h2>
        <a href="/account/addresses">Quản lý địa chỉ</a>
      </header>
      {addresses.length ? (
        <label>
          Địa chỉ đã lưu
          <select value={selectedAddressId} onChange={(event) => selectAddress(event.target.value)}>
            <option value="">Nhập địa chỉ mới</option>
            {addresses.map((address) => (
              <option value={address.id} key={address.id}>
                {address.recipient} - {address.line1}
                {address.isDefault ? ' (mặc định)' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Người nhận
        <input name="recipientName" value={fields.recipientName} onChange={(event) => updateField('recipientName', event.target.value)} autoComplete="name" minLength={2} required />
      </label>
      <label>
        Số điện thoại
        <input name="recipientPhone" value={fields.recipientPhone} onChange={(event) => updateField('recipientPhone', event.target.value)} autoComplete="tel" inputMode="tel" pattern="[0-9+() .-]{6,20}" required />
      </label>
      <label>
        Địa chỉ
        <input name="line1" value={fields.line1} onChange={(event) => updateField('line1', event.target.value)} autoComplete="street-address" minLength={5} required />
      </label>
      <label>
        Thành phố
        <input name="city" value={fields.city} onChange={(event) => updateField('city', event.target.value)} autoComplete="address-level2" required />
      </label>
      <label>
        Tỉnh/Thành
        <input name="province" value={fields.province} onChange={(event) => updateField('province', event.target.value)} autoComplete="address-level1" />
      </label>
      <label className="checkout-policy-consent">
        <input name="acceptedPolicies" type="checkbox" required />
        <span>
          Tôi đã kiểm tra thông tin và đồng ý với <a href="/chinh-sach/mua-hang">chính sách mua hàng</a>,{' '}
          <a href="/chinh-sach/thanh-toan">thanh toán</a> và <a href="/chinh-sach/doi-tra">hủy/đổi trả</a>.
        </span>
      </label>
      <button type="submit" disabled={isSubmitting || isLoading || !cart?.items.length}>
        {isSubmitting ? 'Đang tạo đơn...' : 'Xác nhận tạo đơn hàng'}
      </button>
      {message ? <p className="form-message" role="status" aria-live="polite">{message}</p> : null}
        </form>

        <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
        <header className="checkout-section-heading">
          <h2 id="checkout-summary-title">Đơn hàng của bạn</h2>
          <a href="/cart">Sửa giỏ hàng</a>
        </header>
        {isLoading ? <p role="status">Đang tải giỏ hàng...</p> : null}
        {!isLoading && !cart?.items.length ? (
          <div className="checkout-empty" role="alert">
            <p>Giỏ hàng đang trống.</p>
            <a href="/san-pham">Tiếp tục mua hàng</a>
          </div>
        ) : null}
        <div className="checkout-item-list">
          {cart?.items.map((item) => (
            <article className="checkout-item" key={item.id}>
              <div>
                <strong>{item.product.name}</strong>
                <span>
                  {item.product.orderType === 'RESIN' ? 'Đơn Resin' : 'Đơn Order'} ·{' '}
                  {item.variant?.name ? `${item.variant.name} · ` : ''}Số lượng: {item.quantity}
                </span>
                {item.product.paymentRequirement === 'DEPOSIT' ? <small>Cọc {item.product.depositPercent}%</small> : <small>Thanh toán đủ</small>}
              </div>
              <strong>{formatVnd(item.totalPrice)}</strong>
            </article>
          ))}
        </div>
        <dl className="checkout-totals">
          <div><dt>Tạm tính</dt><dd>{formatVnd(cart?.subtotal ?? '0')}</dd></div>
          <div><dt>Phí giao hàng</dt><dd>Shop xác nhận</dd></div>
          <div><dt>Cần thanh toán trước dự kiến</dt><dd>{formatVnd(String(depositRequired))}</dd></div>
        </dl>
        <p className="checkout-summary-note">Phí giao hàng do hệ thống của shop xác định và sẽ được ghi nhận trong đơn. Shop sẽ xác nhận lại tồn kho, số tiền cọc và lịch giao.</p>
        </aside>
      </div>
      <PaymentModal
        paymentId={paymentId}
        onClose={() => {
          setPaymentId(null);
          if (createdOrderId) {
            router.push(`/account/orders/${encodeURIComponent(createdOrderId)}`);
          }
        }}
      />
    </>
  );
}
