import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminChrome } from '../components/chrome/admin-chrome';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quản trị Hanbotorder',
  description: 'Bảng quản trị vận hành Hanbotorder.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AdminChrome>{children}</AdminChrome>
      </body>
    </html>
  );
}
