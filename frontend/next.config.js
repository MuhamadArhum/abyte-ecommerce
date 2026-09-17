// Explicit allowlist only — a wildcard hostname would let next/image fetch and
// process images from any admin-supplied URL, which is an SSRF-adjacent risk
// and widens exposure to known next/image DoS/RCE advisories. Add your real
// image host(s) via NEXT_PUBLIC_IMAGE_HOSTS (comma-separated) in production.
const extraImageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      ...extraImageHosts.map((hostname) => ({ protocol: 'https', hostname })),
    ],
  },
};

module.exports = nextConfig;
