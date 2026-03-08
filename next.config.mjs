/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1024mb', // 1 GB File Upload Support
    },
  },
};

export default nextConfig;
