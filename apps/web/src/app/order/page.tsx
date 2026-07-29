import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export default function OrderPage() {
  redirect('/san-pham?availability=ORDER');
}

export const metadata: Metadata = {
  title: 'Order Figure & Statue',
  description: 'Figure, statue và mô hình sưu tầm nhận đặt hàng theo yêu cầu tại Hanbotorder.',
  alternates: { canonical: '/order' }
};
