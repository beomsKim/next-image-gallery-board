/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google 프로필 이미지
      },
    ],
  },
  // 성능 최적화
  compress: true,
  poweredByHeader: false,
  // 프로덕션 빌드 최적화
  swcMinify: true,
};

module.exports = nextConfig;