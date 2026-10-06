"use client";

import { useEffect } from "react";
import { Check, Minus, Plus, Flame, Snowflake, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRupiah, isPastryOrFood } from "@/lib/utils";
import type { ModifierGroupDTO } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useCartStore } from "@/stores/cart-store";
import {
  useModifierStore,
  draftUnitPrice,
  missingRequiredGroups,
  selectionsToModifiers,
} from "@/stores/modifier-store";

const OPTION_ICON: Record<string, typeof Snowflake> = {
  ICE_REGULAR: Snowflake,
  ICE_LESS: Snowflake,
  TEMP_ICED: Snowflake,
};
const QUICK_NOTES = ["Less ice", "Extra ice", "No ice", "Normal sweet", "Less sweet", "Separate cup"];

/** Keyboard shortcuts while the modal is open */
const HOTKEYS: Record<string, [string, string]> = {
  r: ["SIZE", "SIZE_REGULAR"],
  i: ["TEMPERATURE", "ICE_REGULAR"],
  l: ["TEMPERATURE", "ICE_LESS"],
  m: ["MILK", "MILK_FRESH"],
};

export function ModifierDialog() {
  const s = useModifierStore();
  const addLine = useCartStore((st) => st.addLine);
  const replaceLine = useCartStore((st) => st.replaceLine);
  const product = s.product;

  const unitPrice = product ? draftUnitPrice(product, s.selections) : 0;
  const lineTotal = unitPrice * s.quantity;

  const submit = () => {
    if (!product) return;
    const missing = missingRequiredGroups(product, s.selections);
    if (missing.length) {
      s.flagInvalid(missing.map((g) => g.id));
      toast.error(`Please select: ${missing.map((g) => g.name).join(" & ")}`);
      return;
    }
    const input = {
      product,
      modifiers: selectionsToModifiers(product, s.selections),
      note: s.note,
      quantity: s.quantity,
    };
    if (s.editingLineId) {
      replaceLine(s.editingLineId, input);
      toast.success(`${product.name} updated in order`);
    } else {
      addLine(input);
      toast.success(`Added ${product.name} to order`);
    }
    s.close();
  };

  useEffect(() => {
    if (!s.isOpen) return;
    if (product && (isPastryOrFood(product) || !product.modifierGroups || product.modifierGroups.length === 0)) {
      addLine({
        product: {
          id: product.id,
          name: product.name,
          categoryName: product.categoryName,
          isBeverage: false,
          basePrice: product.basePrice,
        },
        modifiers: [],
        quantity: s.quantity || 1,
        note: s.note,
      });
      toast.success(`Added ${product.name} to order`);
      s.close();
      return;
    }

    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
        return;
      }
      if (e.key === "+" || e.key === "=") s.setQuantity(s.quantity + 1);
      if (e.key === "-") s.setQuantity(s.quantity - 1);
      const hk = HOTKEYS[e.key.toLowerCase()];
      if (hk) s.selectByCode(hk[0], hk[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.isOpen, s.selections, s.quantity, s.note, product]);

  return (
    <Dialog open={s.isOpen} onOpenChange={(o) => !o && s.close()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl bg-[#111726] border border-white/10 text-white shadow-2xl shadow-black/80">
        {product && (
          <>
            {/* Header */}
            <div className="relative border-b border-white/10 bg-[#161F30] px-6 pt-5 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  {product.categoryName}
                </span>
                {product.tag && (
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-300 border border-white/10 uppercase">
                    {product.tag}
                  </span>
                )}
              </div>
              <DialogTitle className="mt-1 text-xl font-bold text-white">
                {product.name}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-slate-400">
                {product.description || (isPastryOrFood(product) ? "Freshly baked artisan pastry" : "Customise your handcrafted specialty coffee")} · Base {formatRupiah(product.basePrice)}
              </DialogDescription>
            </div>

            {/* Modifier Groups scroll area */}
            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {product.modifierGroups.map((group) => {
                const selected = s.selections[group.id] ?? [];
                const isInvalid = s.invalidGroupIds.includes(group.id);

                return (
                  <div
                    key={group.id}
                    className={cn(
                      "rounded-xl border p-4 transition-all",
                      isInvalid
                        ? "animate-shake border-red-500/80 bg-red-950/20 ring-1 ring-red-500/40"
                        : "border-white/10 bg-[#0E131F]"
                    )}
                  >
                    {/* Group Header */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          {group.name}
                        </span>
                        {group.isRequired ? (
                          <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-slate-300 border border-white/10">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Optional {group.maxSelect > 1 && `(up to ${group.maxSelect})`}
                          </span>
                        )}
                      </div>

                      {isInvalid && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                          <AlertCircle className="w-3.5 h-3.5" /> Please choose one
                        </span>
                      )}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {group.options.map((opt) => {
                        const active = selected.includes(opt.id);
                        const Icon = OPTION_ICON[opt.code];

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => s.toggleOption(group, opt.id)}
                            className={cn(
                              "relative flex items-center justify-between rounded-xl border p-3 text-left text-xs font-medium transition-all duration-150 select-none",
                              active
                                ? "border-rose-500/80 bg-rose-500/10 text-white ring-1 ring-rose-500/40"
                                : "border-white/10 bg-[#161F30] text-slate-300 hover:border-white/20 hover:text-white"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {Icon && (
                                <Icon
                                  className={cn(
                                    "w-3.5 h-3.5 shrink-0",
                                    opt.code === "TEMP_HOT" ? "text-amber-400" : "text-cyan-400"
                                  )}
                                />
                              )}
                              <span>{opt.name}</span>
                            </span>

                            <div className="flex items-center gap-1.5">
                              {opt.priceDelta > 0 && (
                                <span className="text-[10px] font-mono font-bold text-cyan-400 tabular-nums">
                                  +{formatRupiah(opt.priceDelta)}
                                </span>
                              )}
                              {active && <Check className="w-3.5 h-3.5 text-rose-400" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Barista Instructions / Notes */}
              <div className="rounded-xl border border-white/10 bg-[#0E131F] p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">
                  Barista Instructions & Cup Notes
                </label>

                {/* Quick note chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {QUICK_NOTES.map((qn) => (
                    <button
                      key={qn}
                      type="button"
                      onClick={() => {
                        const cur = s.note.trim();
                        if (!cur) s.setNote(qn);
                        else if (!cur.includes(qn)) s.setNote(`${cur}, ${qn}`);
                      }}
                      className="rounded-lg border border-white/10 bg-[#161F30] px-2.5 py-1 text-[10px] font-medium text-slate-300 hover:border-white/20 hover:text-white transition-colors"
                    >
                      +{qn}
                    </button>
                  ))}
                </div>

                <Textarea
                  value={s.note}
                  onChange={(e) => s.setNote(e.target.value)}
                  placeholder="e.g. Extra hot, write 'Sarah' on cup, separate oat milk..."
                  rows={2}
                  maxLength={140}
                  className="bg-[#161F30] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Footer with Qty & Add to Order */}
            <div className="flex items-center justify-between border-t border-white/10 bg-[#111726] px-6 py-4">
              {/* Quantity Stepper */}
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#161F30] p-1">
                <button
                  type="button"
                  onClick={() => s.setQuantity(s.quantity - 1)}
                  disabled={s.quantity <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all"
                >
                  <Minus className="w-4 h-4 text-cyan-400" />
                </button>
                <span className="w-7 text-center font-mono text-sm font-bold text-cyan-400">
                  {s.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => s.setQuantity(s.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => s.close()}
                  className="border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={submit}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-6 shadow-md shadow-rose-950/40 transition-all"
                >
                  {s.editingLineId ? "Update Item" : "Add to Order"} • {formatRupiah(lineTotal)}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
