import type { NextConfig } from "next";

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres.wafeaoqxmdxemhynvbjn:DuvalCoffee2026%21@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const DIRECT_URL =
  process.env.DIRECT_URL ||
  "postgresql://postgres.wafeaoqxmdxemhynvbjn:DuvalCoffee2026%21@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wafeaoqxmdxemhynvbjn.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_lyYoIWqGFTZl_gNuk9zr2A_08rDJiqt";

const nextConfig: NextConfig = {
  // exceljs runs in Node.js runtime for buffer generation.
  serverExternalPackages: ["exceljs"],
  env: {
    DATABASE_URL: DB_URL,
    DIRECT_URL: DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
  },
};

export default nextConfig;
