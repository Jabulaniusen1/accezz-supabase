import withPWA from '@ducanh2912/next-pwa';
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

  webpack: (config: unknown, { isServer }: { isServer: boolean }) => {
    const cfg = config as { resolve?: { fallback?: Record<string, unknown> } };
    if (!isServer) {
      cfg.resolve = cfg.resolve || {};
      cfg.resolve.fallback = {
        ...cfg.resolve.fallback,
        fs: false,
      };
    }
    return cfg;
  },

  // i18n is a Pages Router feature — do NOT use it in App Router.
};

export default withPWA({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
