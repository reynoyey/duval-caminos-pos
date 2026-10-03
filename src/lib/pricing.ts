import type { DiscountInput } from "./types";

/**
 * Single source of truth for money math — imported by the Zustand cart
 * (instant UI feedback) AND by the /api/orders route (authoritative).
 * All values are integer Rupiah.
 */

export const TAX_RATE_PERCENT = 0; // Tax removed per user request

export interface Totals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export function computeDiscount(subtotal: number, discount: DiscountInput | null | undefined) {
  if (!discount || discount.type === "NONE" || discount.value <= 0) return 0;
  const raw =
    discount.type === "PERCENT"
      ? Math.round((subtotal * Math.min(discount.value, 100)) / 100)
      : Math.round(discount.value);
  return Math.max(0, Math.min(raw, subtotal));
}

/** PB1 is charged on the net amount after discount. */
export function computeTotals(subtotal: number, discount?: DiscountInput | null): Totals {
  const discountAmount = computeDiscount(subtotal, discount);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.round((taxableAmount * TAX_RATE_PERCENT) / 100);
  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total: taxableAmount + taxAmount,
  };
}

/** Quick-cash suggestions: exact, then next round-ups, then common notes. */
export function quickCashOptions(total: number): number[] {
  if (total <= 0) return [];
  const set = new Set<number>([total]);
  for (const step of [5000, 10000, 20000, 50000, 100000]) {
    const v = Math.ceil(total / step) * step;
    if (v > total) set.add(v);
  }
  for (const note of [50000, 100000, 150000, 200000]) if (note > total) set.add(note);
  return [...set].sort((a, b) => a - b).slice(0, 6);
}
