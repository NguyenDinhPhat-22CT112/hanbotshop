import type { Metadata } from 'next';
import { Breadcrumb } from '../../components/breadcrumb';
import { CheckoutForm } from '../../components/checkout-form';

export default function CheckoutPage() {
  return (
    <main>
      <Breadcrumb
        items={[
          { label: 'Giỏ hàng', href: '/cart' },
          { label: 'Thanh toán' }
        ]}
      />

      <section className="catalog-header">
        <p className="eyebrow">Thanh toán</p>
        <h1>Thông tin giao hàng</h1>
      </section>
      <section className="narrow-section">
        <CheckoutForm />
      </section>
    </main>
  );
}
export const metadata: Metadata = { title: 'Thanh toán', robots: { index: false, follow: false } };
