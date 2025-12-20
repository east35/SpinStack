/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['i.discogs.com', 'img.discogs.com'],
  },
}

module.exports = nextConfig
