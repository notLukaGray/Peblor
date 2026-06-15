import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.*"],
  poweredByHeader: false,
  logging: {
    incomingRequests: {
      ignore: [/\/api\/dev\/content-watch/, /\/api\/dev\/page-validation/],
    },
  },
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "three",
      "@react-three/drei",
      "@react-three/fiber",
      "react-markdown",
      "zustand",
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/**": ["../../content/**/*", "../../peblor.config.json"],
  },
  transpilePackages: ["@pb/core", "@pb/runtime-react", "@pb/contracts"],
};

export default nextConfig;
