import withPWA from '@ducanh2912/next-pwa';
import { Configuration } from 'webpack';
import type { NextConfig } from 'next';

const remoteImageHosts: { protocol: 'http' | 'https'; hostname: string }[] = [
  { protocol: 'https', hostname: 'via.placeholder.com' },
  { protocol: 'https', hostname: 'img.icons8.com' },
  { protocol: 'https', hostname: 'img.freepik.com' },
  { protocol: 'https', hostname: 'res.cloudinary.com' },
  { protocol: 'http', hostname: 'res.cloudinary.com' },
  { protocol: 'https', hostname: 'images.squarespace-cdn.com' },
  { protocol: 'https', hostname: 'images.unsplash.com' },
  { protocol: 'https', hostname: 'api.qrserver.com' },
];

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
  ...remoteImageHosts.map(({ protocol, hostname }) => ({
    protocol,
    hostname,
    port: '',
    pathname: '/**',
  })),
  {
    protocol: 'https' as const,
    hostname: '*.supabase.co',
    port: '',
    pathname: '/**',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns,
  },

  webpack: (config: Configuration, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
