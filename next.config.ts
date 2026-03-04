import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  experimental: {
    // serverActions enabled by default in Next.js 14+
  },
};

export default nextConfig;
