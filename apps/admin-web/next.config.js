/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@forerun/shared-types', '@forerun/shared-constants'],
};

module.exports = nextConfig;