import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://wafeaoqxmdxemhynvbjn.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_lyYoIWqGFTZl_gNuk9zr2A_08rDJiqt",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_lyYoIWqGFTZl_gNuk9zr2A_08rDJiqt",
    DATABASE_URL: "postgresql://postgres.wafeaoqxmdxemhynvbjn:DuvalCoffee2026%21@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
    DIRECT_URL: "postgresql://postgres.wafeaoqxmdxemhynvbjn:DuvalCoffee2026%21@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
  },
  // exceljs runs in Node.js runtime for buffer generation.
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
