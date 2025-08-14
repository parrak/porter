/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://porter-preview.vercel.app/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig
