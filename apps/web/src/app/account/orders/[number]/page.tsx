import { AccountOrderDetailClient } from '../../../../components/account-order-detail-client';

export default function AccountOrderDetailPage({ params }: { params: { number: string } }) {
  return <AccountOrderDetailClient id={decodeURIComponent(params.number)} />;
}
