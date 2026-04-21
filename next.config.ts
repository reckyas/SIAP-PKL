import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build "standalone" dipakai Dockerfile produksi — hasilkan server.js
  // minimal di .next/standalone tanpa perlu install node_modules lagi.
  output: "standalone",
  // Izinkan domain gambar eksternal (nanti dipakai untuk logo DU/DI, foto siswa)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
