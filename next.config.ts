import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'http://192.168.0.*',
    'http://192.168.1.*',
    'http://localhost:*',
  ],
};

export default nextConfig;
