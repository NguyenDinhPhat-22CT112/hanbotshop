import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hanbotorder',
    short_name: 'Hanbotorder',
    description: 'Figure, mô hình sưu tầm, hàng có sẵn và pre-order.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111111',
    lang: 'vi'
  };
}
