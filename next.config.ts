import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Dev resources are blocked when the page is opened as 127.0.0.1 rather than localhost.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
