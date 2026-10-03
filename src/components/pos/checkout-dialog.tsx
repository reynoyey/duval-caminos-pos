"use client";

import { useState, useMemo } from "react";
import { Banknote, QrCode, CreditCard, ArrowRight, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { cn, formatRupiah } from "@/lib/utils";
import { quickCashOptions, TAX_RATE_PERCENT } from "@/lib/pricing";
import { useCartStore, useCartTotals } from "@/stores/cart-store";
import { useOrdersStore } from "@/stores/orders-store";
import type { OrderRecordDTO, PaymentMethod, QrisMode } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId?: string;
  cashierName?: string;
  onOrderSettled: (order: OrderRecordDTO) => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  shiftId = "shift-live-01",
  cashierName = "Alex Rivera",
  onOrderSettled,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [tenderedStr, setTenderedStr] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lines = useCartStore((s) => s.lines);
  const orderType = useCartStore((s) => s.orderType);
  const customerName = useCartStore((s) => s.customerName);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const discount = useCartStore((s) => s.discount);
  const resetOrder = useCartStore((s) => s.resetOrder);
  const addOrder = useOrdersStore((s) => s.addOrder);

  const totals = useCartTotals();
  const total = totals.total;

  const quickAmounts = useMemo(() => quickCashOptions(total), [total]);

  const tendered = useMemo(() => {
    if (method !== "CASH") return total;
    const num = Number(tenderedStr.replace(/\D/g, ""));
    return isNaN(num) || num === 0 ? total : num;
  }, [method, tenderedStr, total]);

  const change = Math.max(0, tendered - total);
  const isShort = method === "CASH" && tendered < total;

  const handleFinishPayment = async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required for order preparation");
      return;
    }
    if (lines.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (isShort) {
      toast.error("Tendered cash is less than the total balance");
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const { queueNumber, orderNumber } = useOrdersStore.getState().getNextOrderNumber();

      const newOrder: OrderRecordDTO = {
        id: "ord-" + Math.random().toString(36).slice(2, 9),
        orderNumber,
        queueNumber,
        orderType,
        customerName: customerName.trim(),
        tableNumber: tableNumber?.trim() || null,
        status: "PROCESSING", // Order goes straight to In Preparation (Brewing)
        subtotal: totals.subtotal,
        discountType: discount.type,
        discountValue: discount.value,
        discountCode: discount.code || null,
        discountAmount: totals.discountAmount,
        taxRate: TAX_RATE_PERCENT,
        taxAmount: totals.taxAmount,
        total: totals.total,
        shiftId,
        cashierName,
        createdAt: now.toISOString(),
        items: lines.map((l) => ({
          id: "item-" + Math.random().toString(36).slice(2, 9),
          productId: l.productId,
          productName: l.productName,
          categoryName: l.categoryName,
          isBeverage: l.isBeverage,
          basePrice: l.basePrice,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.unitPrice * l.quantity,
          note: l.note || null,
          modifiers: l.modifiers.map((m) => ({
            groupCode: m.groupCode,
            groupName: m.groupName,
            optionCode: m.optionCode,
            optionName: m.optionName,
            priceDelta: m.priceDelta,
          })),
        })),
        payment: {
          method,
          amount: totals.total,
          tendered,
          change,
          qrisMode: method === "QRIS" ? "DYNAMIC" : null,
          reference: reference.trim() || (method === "QRIS" ? "QRIS-SIM-" + Math.floor(100000 + Math.random() * 900000) : null),
          paidAt: now.toISOString(),
        },
      };

      // Add to state store
      addOrder(newOrder);

      // Play audio chime if Web Audio API available
      if (typeof window !== "undefined" && "AudioContext" in window) {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch {}
      }

      toast.success(`Order #${newOrder.orderNumber} sent to kitchen queue!`);
      resetOrder();
      onOpenChange(false);
      onOrderSettled(newOrder);
    } catch (err) {
      console.error(err);
      toast.error("Failed to finalize order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#111726] border border-white/10 text-white p-0 overflow-hidden shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="bg-[#161F30] px-6 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Payment & Order Dispatch
              </span>
              <DialogTitle className="text-xl font-bold text-white mt-0.5">
                Checkout — {customerName ? `for ${customerName}` : "New Order"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {orderType === "DINE_IN" ? "Dine-In Table Service" : "Takeaway Order"} · {lines.length} items
              </DialogDescription>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Grand Total</span>
              <span className="text-2xl font-black text-cyan-400 tabular-nums">
                {formatRupiah(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "CASH", label: "Cash / Tunai", icon: Banknote },
              { id: "QRIS", label: "QRIS", icon: QrCode },
              { id: "DEBIT_EDC", label: "Debit / Card", icon: CreditCard },
            ].map((pm) => {
              const active = method === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setMethod(pm.id as PaymentMethod)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all duration-150 select-none",
                    active
                      ? "border-rose-500/80 bg-rose-500/10 text-white ring-1 ring-rose-500/40"
                      : "border-white/10 bg-[#0E131F] text-slate-400 hover:border-white/20 hover:text-white"
                  )}
                >
                  <pm.icon className={cn("w-5 h-5", active ? "text-rose-400" : "text-slate-400")} />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: CASH */}
          {method === "CASH" && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-[#0E131F] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Quick Cash Tender
                </span>
                <span className="text-[11px] text-cyan-400 font-bold font-mono">Total: {formatRupiah(total)}</span>
              </div>

              {/* Quick cash pills */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTenderedStr(String(total))}
                  className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"
                >
                  Exact Cash
                </button>
                {quickAmounts
                  .filter((a) => a !== total)
                  .map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedStr(String(amt))}
                      className="rounded-xl border border-white/10 bg-[#161F30] py-2 text-xs font-medium text-slate-200 hover:border-white/20 hover:text-white transition-all"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
              </div>

              {/* Custom Cash Tendered input */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex justify-between text-xs">
                  <label htmlFor="tendered-input" className="font-semibold text-slate-300">
                    Custom Cash Tendered (IDR)
                  </label>
                  <span className="font-mono text-cyan-400 font-bold">{formatRupiah(tendered)}</span>
                </div>
                <Input
                  id="tendered-input"
                  value={tenderedStr}
                  onChange={(e) => setTenderedStr(e.target.value)}
                  placeholder={`e.g. ${total}`}
                  className="h-11 text-base font-mono font-bold bg-[#161F30] border border-white/10 text-cyan-400 focus:border-cyan-400"
                />
              </div>

              {/* Instant Change Calculator Box */}
              <div
                className={cn(
                  "flex items-center justify-between rounded-xl p-3.5 border transition-all",
                  isShort
                    ? "border-red-500/40 bg-red-950/20 text-red-300"
                    : "border-cyan-500/30 bg-cyan-950/20 text-cyan-300"
                )}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                    {isShort ? "Insufficient Cash" : "Change to Customer"}
                  </span>
                  <span className="text-xl font-bold tabular-nums">
                    {isShort ? `Short by ${formatRupiah(total - tendered)}` : formatRupiah(change)}
                  </span>
                </div>

                {!isShort && (
                  <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                )}
                {isShort && (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                )}
              </div>
            </div>
          )}

          {/* TAB 2: QRIS (Using Printed QRIS Sheet at Counter) */}
          {method === "QRIS" && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0E131F] p-6 space-y-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <QrCode className="w-7 h-7 text-cyan-400" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Kertas Print QRIS Meja Kasir
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Silakan arahkan pelanggan untuk scan lembaran cetak QRIS fisik yang ada di meja kasir.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161F30] border border-white/10">
                  <span className="text-[11px] text-slate-300 uppercase font-semibold">Total yang Harus Dibayar:</span>
                  <span className="font-mono text-base font-bold text-cyan-400">{formatRupiah(total)}</span>
                </div>
              </div>

              {/* ACC & DECLINE Buttons */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-md pt-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.error("Pembayaran QRIS dibatalkan atau belum diterima");
                  }}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 px-4 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-red-300 font-semibold transition-all text-xs"
                >
                  <div className="flex items-center gap-1.5 text-red-400 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>DECLINE / BATAL</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">Dana belum masuk</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinishPayment}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 px-4 rounded-xl border border-emerald-500/30 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all text-xs"
                >
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>ACC / BERHASIL</span>
                  </div>
                  <span className="text-[10px] text-emerald-100 font-normal">Kirim order ke barista</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DEBIT / EDC */}
          {method === "DEBIT_EDC" && (
            <div className="space-y-3.5 rounded-xl border border-white/10 bg-[#0E131F] p-4">
              <div className="text-xs text-slate-300">
                <p className="font-semibold uppercase tracking-wider mb-2">Supported Card Networks</p>
                <div className="flex gap-2 flex-wrap">
                  {["BCA Card", "Mandiri Debit", "BRI", "BNI", "Visa / Mastercard"].map((card) => (
                    <span
                      key={card}
                      className="px-2.5 py-1 rounded-lg bg-[#161F30] border border-white/10 text-[10px] text-cyan-400 font-mono font-medium"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label htmlFor="edc-ref" className="text-xs font-semibold text-slate-300">
                  EDC Trace / Approval Reference Number
                </label>
                <Input
                  id="edc-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. 482109 or RRN-98214"
                  className="h-10 text-xs font-mono bg-[#161F30] border border-white/10 text-white focus:border-cyan-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#111726] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={isSubmitting || isShort}
            onClick={handleFinishPayment}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-6 h-11 transition-all shadow-md shadow-rose-950/40"
          >
            <span>Confirm Payment & Dispatch</span>
            <ArrowRight className="w-4 h-4 ml-1.5 text-white/80" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
