import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs runs in Node.js runtime for buffer generation.
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
