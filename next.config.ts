import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'http://192.168.0.*',
    'https://192.168.0.*',
    'http://192.168.1.*',
    'https://192.168.1.*',
    'http://192.168.219.*',
    'https://192.168.219.*',
    'http://localhost:*',
    'https://localhost:*',
  ],
  devIndicators: false,
  reactStrictMode: false,
};

export default nextConfig;
