import type { NextConfig } from "next";
import path from "path";
import createBundleAnalyzer from "@next/bundle-analyzer";
import cdnConfig from "@content/config/cdn.json";

const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

function getCdnHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

const cdnHostname = getCdnHostname(cdnConfig.cdnBase);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.*"],
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/pb-dev/playground", destination: "/playground", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
    inlineCss: true,
    staleTimes: {
      dynamic: 300,
      static: 300,
    },
  },
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  outputFileTracingIncludes: {
    "/**": ["../../content/**/*", "../../peblor.config.json"],
  },
  outputFileTracingExcludes: {
    "*": ["**/next.config.ts"],
  },
  images: cdnHostname
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: cdnHostname,
            pathname: "/**",
          },
        ],
        loader: "custom",
        loaderFile: "./src/core/lib/next-image-loader.ts",
      }
    : undefined,
};

export default withBundleAnalyzer(nextConfig);
