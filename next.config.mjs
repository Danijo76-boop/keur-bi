/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dossier de compilation : modifiable pour compiler une version de production sans gêner le serveur de développement.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
};

export default nextConfig;
