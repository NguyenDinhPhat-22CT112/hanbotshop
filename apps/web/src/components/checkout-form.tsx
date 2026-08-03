'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { checkout, createPaymentSession, getAddresses, getCart, type Address } from '../lib/browser-api';
import { calculateDepositRequired } from '../lib/checkout-utils';
import { PaymentModal } from './bank-transfer-payment';
import { CheckoutProgress } from './checkout/checkout-progress';
import { TrustIndicators } from './checkout/trust-indicators';
import { ShippingForm } from './checkout/shipping-form';
import { OrderSummary } from './checkout/order-summary';

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
      <div className="checkout-container">
        <CheckoutProgress currentStep="shipping" />
        <TrustIndicators />

        <div className="checkout-layout">
          <ShippingForm
            fields={fields}
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            isLoading={isLoading}
            isSubmitting={isSubmitting}
            hasItems={!!cart?.items.length}
            message={message}
            onFieldUpdate={updateField}
            onAddressSelect={selectAddress}
            onSubmit={submit}
          />

          <OrderSummary
            items={cart?.items ?? []}
            subtotal={cart?.subtotal ?? '0'}
            depositRequired={depositRequired}
            isLoading={isLoading}
          />
        </div>
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
