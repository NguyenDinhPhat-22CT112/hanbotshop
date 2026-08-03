import type { Metadata } from 'next';
import { CheckoutForm } from '../../components/checkout-form';
import '../checkout.css';

export default function CheckoutPage() {
  return (
    <main>
      <CheckoutForm />
    </main>
  );
}
export const metadata: Metadata = { title: 'Thanh toán', robots: { index: false, follow: false } };
