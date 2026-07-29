import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const internalApiUrl = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1'
).replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    cpus: 1,
    outputFileTracingRoot: workspaceRoot
  },
  transpilePackages: ['@hanbotorder/ui', '@hanbotorder/types'],
  async redirects() {
    return [
      { source: '/collections/tat-ca-san-pham', destination: '/san-pham', permanent: true },
      { source: '/pages/chinh-sach-mua-hang', destination: '/chinh-sach/mua-hang', permanent: true },
      { source: '/pages/chinh-sach-thanh-toan', destination: '/chinh-sach/thanh-toan', permanent: true },
      { source: '/pages/chinh-sach-giao-hang', destination: '/chinh-sach/giao-hang', permanent: true },
      { source: '/pages/chinh-sach-doi-tra', destination: '/chinh-sach/doi-tra', permanent: true }
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/order', destination: '/san-pham?availability=ORDER' },
        { source: '/resin', destination: '/san-pham?tags=resin' }
      ],
      afterFiles: [
        {
          source: '/api/v1/:path*',
          destination: `${internalApiUrl}/:path*`
        }
      ]
    };
  }
};

export default nextConfig;
