const internalApiUrl = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1'
).replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['@hanbotorder/types'],
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
