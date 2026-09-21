/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      { source: "/incoming", destination: "/demo", permanent: false },
      { source: "/outlook", destination: "/demo", permanent: false },
      { source: "/outlook/callback", destination: "/demo", permanent: false },
    ];
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};
module.exports = nextConfig;
