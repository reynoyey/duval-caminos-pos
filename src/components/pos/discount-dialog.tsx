"use client";

import { useState } from "react";
import { BadgePercent, Ticket } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRupiah } from "@/lib/utils";
import { VOUCHERS, findVoucher } from "@/lib/vouchers";
import { computeDiscount } from "@/lib/pricing";
import { useCartStore, useCartTotals } from "@/stores/cart-store";
import type { DiscountInput } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DiscountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const setDiscount = useCartStore((s) => s.setDiscount);
  const current = useCartStore((s) => s.discount);
  const { subtotal } = useCartTotals();
  const [code, setCode] = useState("");
  const [manualType, setManualType] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [manualValue, setManualValue] = useState("");

  const apply = (d: DiscountInput) => {
    setDiscount(d);
    toast.success(`Discount applied: ${d.label}`);
    onOpenChange(false);
    setCode("");
    setManualValue("");
  };

  const applyCode = () => {
    const v = findVoucher(code);
    if (!v) return toast.error("Voucher code not recognized");
    apply({ type: v.type, value: v.value, code: v.code, label: v.label });
  };

  const applyManual = () => {
    const value = Number(manualValue.replace(/\D/g, ""));
    if (!value) return toast.error("Please enter a valid discount value");
    if (manualType === "PERCENT" && value > 100) return toast.error("Percentage cannot exceed 100%");
    apply({
      type: manualType,
      value,
      code: null,
      label: manualType === "PERCENT" ? `Manual Discount ${value}%` : `Discount -${formatRupiah(value)}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-[#111726] border border-white/10 text-white shadow-2xl shadow-black/80 p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-white text-lg font-bold">
            <BadgePercent className="w-5 h-5 text-rose-400" />
            <span>Promotions & Vouchers</span>
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Subtotal saat ini {formatRupiah(subtotal)}. Diskon dipotong sebelum kalkulasi total.
          </DialogDescription>
        </DialogHeader>

        {/* Voucher Preset Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
          {VOUCHERS.map((v) => {
            const active = current.code === v.code;
            const savings = computeDiscount(subtotal, v);

            return (
              <button
                key={v.code}
                id={`voucher-${v.code}`}
                type="button"
                onClick={() => apply({ type: v.type, value: v.value, code: v.code, label: v.label })}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-150 select-none",
                  active
                    ? "border-rose-500/80 bg-rose-500/10 text-white ring-1 ring-rose-500/40"
                    : "border-white/10 bg-[#0E131F] text-slate-300 hover:border-white/20 hover:text-white"
                )}
              >
                <Ticket className="mt-0.5 w-4 h-4 shrink-0 text-cyan-400" />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-white">{v.label}</span>
                  <span className="block text-[11px] text-slate-400 truncate">{v.description}</span>
                  <span className="mt-0.5 block font-mono text-[10px] font-bold tracking-wider text-rose-400">
                    {v.code}
                  </span>
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums shrink-0">
                  −{formatRupiah(savings)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Voucher Code Entry */}
        <div className="space-y-1.5 pt-3 border-t border-white/10">
          <Label htmlFor="voucher-code" className="text-xs text-slate-300 font-semibold">
            Redeem Voucher Code
          </Label>
          <div className="flex gap-2">
            <Input
              id="voucher-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && applyCode()}
              placeholder="e.g. CAMINOS10, MEMBER15"
              className="h-10 font-mono font-bold tracking-wider text-xs bg-[#161F30] border border-white/10 text-cyan-400 focus:border-cyan-400"
            />
            <Button
              type="button"
              onClick={applyCode}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-10 px-5 shadow-sm transition-all"
            >
              Apply Code
            </Button>
          </div>
        </div>

        {/* Manual Discount Entry */}
        <div className="space-y-2 pt-3 border-t border-white/10">
          <Label className="text-xs text-slate-300 font-semibold">Manual Cashier Discount</Label>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-white/10 bg-[#0E131F] p-0.5">
              <button
                type="button"
                onClick={() => setManualType("PERCENT")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  manualType === "PERCENT"
                    ? "bg-[#1E293B] text-white border border-white/10"
                    : "text-slate-400 hover:text-white"
                )}
              >
                % Percent
              </button>
              <button
                type="button"
                onClick={() => setManualType("AMOUNT")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  manualType === "AMOUNT"
                    ? "bg-[#1E293B] text-white border border-white/10"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Fixed IDR
              </button>
            </div>

            <Input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder={manualType === "PERCENT" ? "10" : "15000"}
              className="h-10 text-xs bg-[#161F30] border border-white/10 text-white focus:border-cyan-400 flex-1 font-mono"
            />

            <Button
              type="button"
              variant="outline"
              onClick={applyManual}
              className="border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white text-xs h-10 px-4"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
