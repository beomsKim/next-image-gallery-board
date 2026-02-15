import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/webp'],
    deviceSizes: [390, 640, 768, 1024, 1280, 1920],
    imageSizes: [64, 128, 256],
    minimumCacheTTL: 86400, // 이미지 캐시 24시간
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;