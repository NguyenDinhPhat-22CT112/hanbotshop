import { BankTransferPaymentPanel } from '../../../components/bank-transfer-payment';

export default function BankTransferPage({ searchParams }: { searchParams: { paymentId?: string } }) {
  return (
    <main>
      <section className="catalog-header"><p className="eyebrow">Thanh toán</p><h1>Hướng dẫn chuyển khoản</h1></section>
      <section className="narrow-section"><BankTransferPaymentPanel paymentId={searchParams.paymentId ?? ''} /></section>
    </main>
  );
}
