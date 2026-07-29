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
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  experimental: {
    cpus: 1,
    outputFileTracingRoot: workspaceRoot
  },
  transpilePackages: ['@hanbotorder/types'],
  async redirects() {
    return [
      {
        source: '/categories',
        has: [{ type: 'query', key: 'tab', value: 'tags' }],
        destination: '/categories/tags',
        permanent: true
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApiUrl}/:path*`
      }
    ];
  }
};

export default nextConfig;
