/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // We use plain <img> tags for the sign artwork, so the image optimizer is not needed.
  images: { unoptimized: true },
  // Old Turkish URLs keep working.
  async redirects() {
    return [
      { source: "/kartlar", destination: "/cards", permanent: true },
      { source: "/giris", destination: "/login", permanent: true },
      { source: "/eslestir", destination: "/match", permanent: true },
      { source: "/guvenlik", destination: "/safety", permanent: true },
      { source: "/liderlik", destination: "/leaderboard", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // The reset token is in this page's URL: never leak it through the Referer header.
      { source: "/reset", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/verify", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};
export default nextConfig;
