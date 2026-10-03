"use client";

import { create } from "zustand";
import type { ModifierGroupDTO, ProductDTO } from "@/lib/types";
import type { CartLine, CartModifier } from "./cart-store";

// ============================================================================
//  MODIFIER STORE — draft state of the "Varian Minuman" pop-up.
//  Kept separate from the cart so an abandoned customisation never
//  pollutes the order.
// ============================================================================

type Selections = Record<string /* groupId */, string[] /* optionIds */>;

interface ModifierState {
  isOpen: boolean;
  product: ProductDTO | null;
  /** when editing an existing cart line */
  editingLineId: string | null;
  selections: Selections;
  quantity: number;
  note: string;
  /** groups flagged after a failed submit (shake + red ring) */
  invalidGroupIds: string[];

  openForProduct: (product: ProductDTO) => void;
  openForEdit: (product: ProductDTO, line: CartLine) => void;
  close: () => void;

  toggleOption: (group: ModifierGroupDTO, optionId: string) => void;
  selectByCode: (groupCode: string, optionCode: string) => void;
  setQuantity: (q: number) => void;
  setNote: (n: string) => void;
  flagInvalid: (groupIds: string[]) => void;
}

function defaultSelections(product: ProductDTO): Selections {
  const sel: Selections = {};
  for (const g of product.modifierGroups) {
    sel[g.id] = g.options.filter((o) => o.isDefault).map((o) => o.id);
  }
  return sel;
}

export const useModifierStore = create<ModifierState>()((set, get) => ({
  isOpen: false,
  product: null,
  editingLineId: null,
  selections: {},
  quantity: 1,
  note: "",
  invalidGroupIds: [],

  openForProduct: (product) =>
    set({
      isOpen: true,
      product,
      editingLineId: null,
      selections: defaultSelections(product),
      quantity: 1,
      note: "",
      invalidGroupIds: [],
    }),

  openForEdit: (product, line) => {
    const selections: Selections = {};
    for (const g of product.modifierGroups) {
      selections[g.id] = line.modifiers.filter((m) => m.groupId === g.id).map((m) => m.optionId);
    }
    set({
      isOpen: true,
      product,
      editingLineId: line.lineId,
      selections,
      quantity: line.quantity,
      note: line.note,
      invalidGroupIds: [],
    });
  },

  close: () => set({ isOpen: false }),

  toggleOption: (group, optionId) =>
    set((s) => {
      const current = s.selections[group.id] ?? [];
      let next: string[];

      if (group.selectionType === "SINGLE") {
        const hasDefault = group.options.some((o) => o.isDefault);
        // Optional radio without a default can be un-ticked by tapping again.
        next =
          current.includes(optionId) && !group.isRequired && !hasDefault ? [] : [optionId];
      } else if (current.includes(optionId)) {
        next = current.filter((id) => id !== optionId);
      } else {
        next = [...current, optionId];
        if (next.length > group.maxSelect) next = next.slice(next.length - group.maxSelect);
      }

      return {
        selections: { ...s.selections, [group.id]: next },
        invalidGroupIds: s.invalidGroupIds.filter((id) => id !== group.id),
      };
    }),

  // Keyboard shortcuts (H / I / R / L) map to option codes.
  selectByCode: (groupCode, optionCode) => {
    const { product, toggleOption, selections } = get();
    const group = product?.modifierGroups.find((g) => g.code === groupCode);
    const option = group?.options.find((o) => o.code === optionCode);
    if (!group || !option) return;
    if (group.selectionType === "SINGLE" && selections[group.id]?.includes(option.id)) return;
    toggleOption(group, option.id);
  },

  setQuantity: (q) => set({ quantity: Math.max(1, Math.min(99, q)) }),
  setNote: (note) => set({ note }),
  flagInvalid: (invalidGroupIds) => set({ invalidGroupIds }),
}));

// ---------------------------------------------------------------------------
//  Pure helpers (usable in components & tests)
// ---------------------------------------------------------------------------

export function missingRequiredGroups(product: ProductDTO, selections: Selections) {
  return product.modifierGroups.filter(
    (g) => (g.isRequired || g.minSelect > 0) && (selections[g.id]?.length ?? 0) < Math.max(1, g.minSelect),
  );
}

export function selectionsToModifiers(product: ProductDTO, selections: Selections): CartModifier[] {
  const mods: CartModifier[] = [];
  for (const g of product.modifierGroups) {
    for (const o of g.options) {
      if (selections[g.id]?.includes(o.id)) {
        mods.push({
          groupId: g.id,
          groupCode: g.code,
          groupName: g.name,
          optionId: o.id,
          optionCode: o.code,
          optionName: o.name,
          priceDelta: o.priceDelta,
        });
      }
    }
  }
  return mods;
}

export function draftUnitPrice(product: ProductDTO, selections: Selections) {
  return selectionsToModifiers(product, selections).reduce(
    (sum, m) => sum + m.priceDelta,
    product.basePrice,
  );
}
