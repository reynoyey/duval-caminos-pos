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
