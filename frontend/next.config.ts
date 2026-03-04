import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.rfc.com.tn",
        pathname: "/assets/images/**",
      },
    ],
  },
};

export default nextConfig;
