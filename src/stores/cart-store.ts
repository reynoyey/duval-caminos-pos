"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { computeTotals } from "@/lib/pricing";
import type { DiscountInput, OrderType, ProductDTO } from "@/lib/types";

// ============================================================================
//  CART STORE — order header + line items + discount
// ============================================================================

export interface CartModifier {
  groupId: string;
  groupCode: string;
  groupName: string;
  optionId: string;
  optionCode: string;
  optionName: string;
  priceDelta: number;
}

export interface CartLine {
  lineId: string;
  productId: string;
  productName: string;
  categoryName: string;
  isBeverage: boolean;
  basePrice: number;
  modifiers: CartModifier[];
  note: string;
  quantity: number;
  /** basePrice + Σ priceDelta (per unit) */
  unitPrice: number;
}

export interface AddLineInput {
  product: Pick<ProductDTO, "id" | "name" | "categoryName" | "isBeverage" | "basePrice">;
  modifiers: CartModifier[];
  note?: string;
  quantity?: number;
}

interface CartState {
  orderType: OrderType;
  customerName: string;
  tableNumber: string;
  lines: CartLine[];
  discount: DiscountInput;
  /** for the "just added" highlight animation */
  lastTouchedLineId: string | null;

  setOrderType: (t: OrderType) => void;
  setCustomerName: (v: string) => void;
  setTableNumber: (v: string) => void;

  addLine: (input: AddLineInput) => string;
  replaceLine: (lineId: string, input: AddLineInput) => void;
  incrementQty: (lineId: string) => void;
  decrementQty: (lineId: string) => void;
  removeLine: (lineId: string) => void;

  setDiscount: (d: DiscountInput) => void;
  clearDiscount: () => void;

  resetOrder: () => void;
}

const NO_DISCOUNT: DiscountInput = { type: "NONE", value: 0, code: null, label: null };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/**
 * Two lines are "the same drink" when product, the set of chosen options and
 * the barista note are identical → we bump quantity instead of adding a row.
 */
function lineSignature(productId: string, modifiers: CartModifier[], note: string) {
  const opts = modifiers.map((m) => m.optionId).sort().join(",");
  return `${productId}|${opts}|${note.trim().toLowerCase()}`;
}

function buildLine(input: AddLineInput, lineId = uid()): CartLine {
  const modifierTotal = input.modifiers.reduce((s, m) => s + m.priceDelta, 0);
  return {
    lineId,
    productId: input.product.id,
    productName: input.product.name,
    categoryName: input.product.categoryName,
    isBeverage: input.product.isBeverage,
    basePrice: input.product.basePrice,
    modifiers: input.modifiers,
    note: (input.note ?? "").trim(),
    quantity: Math.max(1, input.quantity ?? 1),
    unitPrice: input.product.basePrice + modifierTotal,
  };
}

const initialHeader = {
  orderType: "TAKEAWAY" as OrderType,
  customerName: "",
  tableNumber: "",
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      ...initialHeader,
      lines: [],
      discount: NO_DISCOUNT,
      lastTouchedLineId: null,

      setOrderType: (orderType) => set({ orderType }),
      setCustomerName: (customerName) => set({ customerName }),
      setTableNumber: (tableNumber) => set({ tableNumber }),

      addLine: (input) => {
        const candidate = buildLine(input);
        const sig = lineSignature(candidate.productId, candidate.modifiers, candidate.note);
        const existing = get().lines.find(
          (l) => lineSignature(l.productId, l.modifiers, l.note) === sig,
        );
        if (existing) {
          set((s) => ({
            lines: s.lines.map((l) =>
              l.lineId === existing.lineId
                ? { ...l, quantity: l.quantity + candidate.quantity }
                : l,
            ),
            lastTouchedLineId: existing.lineId,
          }));
          return existing.lineId;
        }
        set((s) => ({ lines: [...s.lines, candidate], lastTouchedLineId: candidate.lineId }));
        return candidate.lineId;
      },

      replaceLine: (lineId, input) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.lineId === lineId ? buildLine(input, lineId) : l)),
          lastTouchedLineId: lineId,
        })),

      incrementQty: (lineId) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity + 1 } : l)),
          lastTouchedLineId: lineId,
        })),

      decrementQty: (lineId) =>
        set((s) => ({
          lines: s.lines
            .map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity - 1 } : l))
            .filter((l) => l.quantity > 0),
          lastTouchedLineId: lineId,
        })),

      removeLine: (lineId) => set((s) => ({ lines: s.lines.filter((l) => l.lineId !== lineId) })),

      setDiscount: (discount) => set({ discount }),
      clearDiscount: () => set({ discount: NO_DISCOUNT }),

      resetOrder: () =>
        set((s) => ({
          ...initialHeader,
          orderType: s.orderType, // keep cashier's last mode — speeds up rush hour
          lines: [],
          discount: NO_DISCOUNT,
          lastTouchedLineId: null,
        })),
    }),
    {
      name: "duval-pos-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated manually on mount to avoid SSR hydration mismatch.
      skipHydration: true,
      partialize: (s) => ({
        orderType: s.orderType,
        customerName: s.customerName,
        tableNumber: s.tableNumber,
        lines: s.lines,
        discount: s.discount,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
//  Derived selectors (memoised — never return fresh objects from a selector)
// ---------------------------------------------------------------------------

export function useCartTotals() {
  const lines = useCartStore((s) => s.lines);
  const discount = useCartStore((s) => s.discount);
  return useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const cupCount = lines.reduce((sum, l) => sum + (l.isBeverage ? l.quantity : 0), 0);
    return { ...computeTotals(subtotal, discount), itemCount, cupCount };
  }, [lines, discount]);
}
