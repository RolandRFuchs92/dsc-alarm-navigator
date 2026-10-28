import type { NextConfig } from "next";
import { listDevHosts } from "./lib/auth/trusted-origins";

const nextConfig: NextConfig = {
  output: "standalone",
  // Without this, `next dev` blocks its scripts for LAN hosts and the page never hydrates.
  allowedDevOrigins: listDevHosts(process.env.TRUSTED_ORIGINS),
};

export default nextConfig;
