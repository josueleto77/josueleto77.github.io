import type { NextConfig } from "next";

// The GitHub Pages deploy lives under /redormi; the Capacitor native shell
// serves the export from its own origin (http://localhost / capacitor://
// localhost), so it needs no base path at all.
const isCapacitor = process.env.BUILD_TARGET === "capacitor";
const BASE_PATH = isCapacitor ? "" : "/redormi";

const nextConfig: NextConfig = {
  output: "export",
  basePath: BASE_PATH,
  assetPrefix: isCapacitor ? undefined : `${BASE_PATH}/`,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

export default nextConfig;
