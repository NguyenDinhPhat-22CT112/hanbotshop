import type { Metadata } from 'next';
import { AccountOverviewClient } from '../../components/account-overview-client';

export const metadata: Metadata = { title: 'Tài khoản', robots: { index: false, follow: false } };

export default function AccountPage() {
  return <AccountOverviewClient />;
}
