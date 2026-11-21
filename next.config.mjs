/** @type {import('next').NextConfig} */

const developpement = process.env.NODE_ENV !== "production";

// Politique de sécurité du contenu : le navigateur ne charge que ce que le site utilise réellement.
// Les scripts en ligne restent permis car Next.js et le script de thème en ont besoin ; en développement,
// le rechargement à chaud demande en plus « unsafe-eval » et les WebSockets.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${developpement ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://picsum.photos https://tile.openstreetmap.org",
  "font-src 'self' data:",
  `connect-src 'self'${developpement ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(developpement ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const enTetesSecurite = [
  { key: "Content-Security-Policy", value: csp },
  // Interdit d'afficher le site dans un cadre d'un autre site (protection contre le « clickjacking »).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Géolocalisation, caméra et micro ne sont pas utilisés : on les ferme.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HTTPS obligatoire pendant deux ans (uniquement en ligne : en local le site tourne en HTTP).
  ...(developpement ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig = {
  // Dossier de compilation : modifiable pour compiler une version de production sans gêner le serveur de développement.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // N'annonce pas la technologie utilisée.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: enTetesSecurite }];
  },
};

export default nextConfig;
