import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xdszdaklsmevgnhjrrsp.supabase.co",
        pathname: "/storage/v1/object/sign/venue-media/**",
      },
    ],
  },
};

export default nextConfig;
