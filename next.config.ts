import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the content/ folder ships with the server when deployed
  // (e.g. to Vercel), since pages read it from disk at request time.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
  serverExternalPackages: ["mammoth"],
};

export default nextConfig;
