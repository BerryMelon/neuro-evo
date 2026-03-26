import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/neuro-evo',
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
