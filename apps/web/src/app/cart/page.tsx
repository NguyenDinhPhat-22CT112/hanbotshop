import { Breadcrumb } from '../../components/breadcrumb';
import { CartClient } from '../../components/cart-client';

export default function CartPage() {
  return (
    <main>
      <Breadcrumb items={[{ label: 'Giỏ hàng' }]} />

      <section className="cart-page-header">
        <h1>Giỏ hàng của bạn</h1>
      </section>

      <section className="cart-page-content">
        <CartClient />
      </section>
    </main>
  );
}
