import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'http://192.168.0.*',
    'https://192.168.0.*',
    'http://192.168.1.*',
    'https://192.168.1.*',
    'http://localhost:*',
    'https://localhost:*',
  ],
};

export default nextConfig;
