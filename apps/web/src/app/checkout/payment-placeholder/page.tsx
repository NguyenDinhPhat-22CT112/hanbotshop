import { redirect } from 'next/navigation';

export default function LegacyPaymentPage({ searchParams }: { searchParams: { paymentId?: string } }) {
  const query = searchParams.paymentId ? `?paymentId=${encodeURIComponent(searchParams.paymentId)}` : '';

  redirect(`/checkout/bank-transfer${query}`);
}
