import type { MetadataRoute } from 'next';
import { getProducts } from '../lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const paths = ['', '/collections/tat-ca-san-pham', '/lien-he', '/pages/chinh-sach-mua-hang', '/pages/chinh-sach-thanh-toan', '/pages/chinh-sach-giao-hang', '/pages/chinh-sach-doi-tra'];
  const products = await getProducts({ pageSize: 100 }).catch(() => ({ data: [] }));
  return [...paths.map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date(), changeFrequency: 'weekly' as const })), ...products.data.map((product) => ({ url: `${baseUrl}/products/${product.slug}`, lastModified: new Date(), changeFrequency: 'weekly' as const }))];
}
