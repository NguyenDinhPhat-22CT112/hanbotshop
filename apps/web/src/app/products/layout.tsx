import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'Sản phẩm', description: 'Figure, mô hình sưu tầm, sản phẩm có sẵn và pre-order tại Hanbotorder.' };

export default function ProductsLayout({ children }: { children: ReactNode }) { return children; }
