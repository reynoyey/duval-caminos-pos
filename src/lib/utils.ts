import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Rp 32.000 */
export function formatRupiah(value: number) {
  return idr.format(value).replace(/\u00A0/g, " ");
}

/** 32.000 (no currency symbol) */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

/** 32k — compact for buttons */
export function formatShort(value: number) {
  if (value >= 1000 && value % 1000 === 0) return `${value / 1000}k`;
  return formatNumber(value);
}

export const STORE_TZ = "Asia/Jakarta";

export function formatTime(d: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: STORE_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function formatDateTime(d: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: STORE_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

/**
 * Checks whether a product or category belongs to Pastry & Bakery or Food (non-customizable).
 * Pastry/Food items cannot be customized with drink options (no ice, sweetness/sugar, cup size, milk).
 */
export function isPastryOrFood(
  item?: {
    id?: string;
    categoryId?: string;
    categoryName?: string;
    isBeverage?: boolean;
    slug?: string;
    name?: string;
  } | null
): boolean {
  if (!item) return false;
  if (item.isBeverage === false) return true;

  const catId = (item.categoryId || item.id || "").toLowerCase();
  const catName = (item.categoryName || item.name || "").toLowerCase();
  const slug = (item.slug || "").toLowerCase();

  if (catId === "cat-pst" || catId === "pastry") return true;
  if (["pastry", "bakery", "food", "bites", "snack", "croissant"].includes(slug)) return true;

  if (
    catName.includes("pastry") ||
    catName.includes("bakery") ||
    catName.includes("food") ||
    catName.includes("bites") ||
    catName.includes("snack") ||
    catName.includes("roti") ||
    catName.includes("kue")
  ) {
    return true;
  }

  return false;
}

/**
 * Ensures that pastry/food products have no modifier groups and are marked as non-beverage.
 */
export function sanitizeProductModifiers<
  T extends {
    id?: string;
    categoryId?: string;
    categoryName?: string;
    isBeverage?: boolean;
    slug?: string;
    name?: string;
    modifierGroups?: any[];
  }
>(product: T): T {
  const isPastry = isPastryOrFood(product);
  if (isPastry || product.isBeverage === false) {
    return {
      ...product,
      isBeverage: false,
      modifierGroups: [],
    };
  }
  return product;
}

