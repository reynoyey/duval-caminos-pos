"use client";

import { useEffect } from "react";
import { Check, Minus, Plus, Flame, Snowflake, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRupiah } from "@/lib/utils";
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

const OPTION_ICON: Record<string, typeof Flame> = { TEMP_HOT: Flame, TEMP_ICED: Snowflake };
const QUICK_NOTES = ["Less ice", "Extra hot", "No ice", "Thick foam", "Light sweet", "Separate lid"];

/** Keyboard shortcuts while the modal is open */
const HOTKEYS: Record<string, [string, string]> = {
  h: ["TEMPERATURE", "TEMP_HOT"],
  i: ["TEMPERATURE", "TEMP_ICED"],
  r: ["SIZE", "SIZE_REGULAR"],
  l: ["SIZE", "SIZE_LARGE"],
  o: ["MILK", "MILK_OAT"],
  a: ["MILK", "MILK_ALMOND"],
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
  }, [s.isOpen, s.selections, s.quantity, s.note]);

  return (
    <Dialog open={s.isOpen} onOpenChange={(o) => !o && s.close()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl bg-[#100C29] border border-pink-500/30 text-white shadow-2xl shadow-pink-950/50">
        {product && (
          <>
            {/* Header */}
            <div className="relative border-b border-pink-500/20 bg-gradient-to-r from-pink-600/25 via-purple-900/25 to-[#100C29] px-6 pt-5 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-pink-300 uppercase">
                  {product.categoryName}
                </span>
                {product.tag && (
                  <span className="rounded-md bg-pink-500/20 px-2 py-0.5 text-[9px] font-extrabold text-pink-300 border border-pink-500/40 uppercase">
                    {product.tag}
                  </span>
                )}
              </div>
              <DialogTitle className="mt-1 text-xl font-black text-white flex items-center gap-2">
                <span>{product.name}</span>
                <Sparkles className="w-4 h-4 text-cyan-300" />
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-pink-200/70">
                {product.description || "Customise your handcrafted specialty coffee"} · Base {formatRupiah(product.basePrice)}
              </DialogDescription>
            </div>

            {/* Modifier Groups scroll area */}
            <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {product.modifierGroups.map((group) => {
                const selected = s.selections[group.id] ?? [];
                const isInvalid = s.invalidGroupIds.includes(group.id);

                return (
                  <div
                    key={group.id}
                    className={cn(
                      "rounded-2xl border p-4 transition-all",
                      isInvalid
                        ? "animate-shake border-red-500/80 bg-red-950/30 ring-2 ring-red-500/40"
                        : "border-pink-500/20 bg-[#0B081E]"
                    )}
                  >
                    {/* Group Header */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-pink-200">
                          {group.name}
                        </span>
                        {group.isRequired ? (
                          <span className="rounded-md bg-pink-500/20 px-2 py-0.2 text-[9px] font-extrabold text-pink-300 border border-pink-500/40">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-pink-200/60 font-medium">
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
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {group.options.map((opt) => {
                        const active = selected.includes(opt.id);
                        const Icon = OPTION_ICON[opt.code];

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => s.toggleOption(group, opt.id)}
                            className={cn(
                              "relative flex items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition-all duration-150 select-none",
                              active
                                ? "border-pink-400 bg-gradient-to-r from-pink-600/35 to-orange-500/35 text-white shadow-md shadow-pink-500/25 ring-1 ring-pink-400"
                                : "border-pink-500/20 bg-[#140F33] text-stone-200 hover:border-cyan-400/40 hover:text-white"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {Icon && (
                                <Icon
                                  className={cn(
                                    "w-3.5 h-3.5 shrink-0",
                                    opt.code === "TEMP_HOT" ? "text-orange-400" : "text-cyan-400"
                                  )}
                                />
                              )}
                              <span>{opt.name}</span>
                            </span>

                            <div className="flex items-center gap-1.5">
                              {opt.priceDelta > 0 && (
                                <span className="text-[10px] font-mono font-black text-cyan-300 tabular-nums">
                                  +{formatRupiah(opt.priceDelta)}
                                </span>
                              )}
                              {active && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Barista Instructions / Notes */}
              <div className="rounded-2xl border border-pink-500/20 bg-[#0B081E] p-4">
                <label className="block text-xs font-black uppercase tracking-wider text-pink-200 mb-2.5">
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
                      className="rounded-xl border border-pink-500/20 bg-[#140F33] px-3 py-1 text-[10px] font-semibold text-stone-300 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
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
                  className="bg-[#100C29] border border-pink-500/25 text-xs text-white placeholder:text-stone-500 focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Footer with Qty & Add to Order */}
            <div className="flex items-center justify-between border-t border-pink-500/20 bg-[#0B081E] px-6 py-4">
              {/* Quantity Stepper */}
              <div className="flex items-center gap-2 rounded-xl border border-pink-500/25 bg-[#140F33] p-1">
                <button
                  type="button"
                  onClick={() => s.setQuantity(s.quantity - 1)}
                  disabled={s.quantity <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all"
                >
                  <Minus className="w-4 h-4 text-cyan-300" />
                </button>
                <span className="w-7 text-center font-mono text-sm font-black text-cyan-300">
                  {s.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => s.setQuantity(s.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  <Plus className="w-4 h-4 text-cyan-300" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => s.close()}
                  className="border-pink-500/30 text-stone-300 hover:bg-pink-500/10 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={submit}
                  className="bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-extrabold text-xs px-6 shadow-lg shadow-pink-600/40 transition-all hover:scale-[1.02]"
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
