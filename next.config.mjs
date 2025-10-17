const createNextIntlPlugin = (await import('next-intl/plugin')).default;

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export',        // Disabled - using Firebase App Hosting which supports SSR
  trailingSlash: true,     // Add trailing slashes
  images: {
    // unoptimized: true,     // Not needed with App Hosting
    remotePatterns: [
      { protocol: 'https', hostname: 'anime-store.jp' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'cdn.amnibus.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  webpack: (config, { isServer }) => {
    // Ignore problematic scraping files during build
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // Exclude scraping files from webpack bundle
    config.externals.push({
      'src/lib/scraper.ts': 'src/lib/scraper.ts',
      'src/lib/scraper-example.ts': 'src/lib/scraper-example.ts',
      'src/lib/scraping-config.ts': 'src/lib/scraping-config.ts',
    });

    return config;
  },
};

export default withNextIntl(nextConfig);