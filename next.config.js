/** @type {import('next').NextConfig} */
const isStaticExport = process.env.EXPORT_STATIC === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig = {
  reactStrictMode: true,
  // TypeORM (used by the private /budget tool) dynamically requires optional DB drivers it
  // doesn't need here (mysql, sqlite, @sap/hana-client, ...) -- bundling it with webpack produces
  // "module not found" warnings for those. It's server-only, so keep it out of the app bundle.
  experimental: {
    serverComponentsExternalPackages: ['typeorm'],
  },
  ...(isStaticExport
    ? {
        output: 'export',
        trailingSlash: true,
        images: {
          unoptimized: true,
        },
        ...(basePath
          ? {
              basePath,
              assetPrefix: `${basePath}/`,
            }
          : {}),
      }
    : {}),
};

module.exports = nextConfig;