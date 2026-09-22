/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fawrun/shared-types', '@fawrun/shared-constants'],
};

module.exports = nextConfig;