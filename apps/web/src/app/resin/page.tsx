import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export default function ResinPage() {
  redirect('/collections/tat-ca-san-pham?tags=resin');
}

export const metadata: Metadata = {
  title: 'Resin Figure',
  description: 'Các mẫu resin figure và tượng resin sưu tầm tại Hanbotorder.',
  alternates: { canonical: '/resin' }
};
