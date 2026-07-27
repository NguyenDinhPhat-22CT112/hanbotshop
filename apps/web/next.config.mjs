const internalApiUrl = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api/v1'
).replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@hanbotorder/ui', '@hanbotorder/types'],
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
