/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};
export default nextConfig;
