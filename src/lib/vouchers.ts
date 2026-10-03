import type { DiscountInput } from "./types";

/**
 * Promotional & Loyalty Vouchers for Duval Caminos Coffee
 */
export const VOUCHERS: (DiscountInput & { code: string; label: string; description: string })[] = [
  { code: "CAMINOS10", type: "PERCENT", value: 10, label: "Caminos 10%", description: "10% off entire order" },
  { code: "MEMBER15", type: "PERCENT", value: 15, label: "VIP Member 15%", description: "Duval Caminos VIP Member Club" },
  { code: "HAPPYHOUR", type: "PERCENT", value: 20, label: "Happy Hour 20%", description: "Specialty afternoon brew discount (2PM - 5PM)" },
  { code: "WELCOME10K", type: "AMOUNT", value: 10000, label: "Welcome Rp 10,000", description: "First-time visitor welcome discount" },
  { code: "STAFF50", type: "PERCENT", value: 50, label: "Staff Perk 50%", description: "Barista & employee meal benefit" },
];

export function findVoucher(code: string | null | undefined) {
  if (!code) return undefined;
  return VOUCHERS.find((v) => v.code === code.trim().toUpperCase());
}
