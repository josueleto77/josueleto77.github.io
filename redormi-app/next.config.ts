import type { NextConfig } from "next";

const BASE_PATH = "/redormi";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: `${BASE_PATH}/`,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

export default nextConfig;
