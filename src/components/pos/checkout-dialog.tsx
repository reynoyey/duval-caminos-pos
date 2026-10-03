"use client";

import { useState, useMemo } from "react";
import { Banknote, QrCode, CreditCard, ArrowRight, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { cn, formatRupiah } from "@/lib/utils";
import { quickCashOptions } from "@/lib/pricing";
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
      const dateKey = now.toISOString().slice(2, 10).replace(/-/g, "");
      const queueNumber = Math.floor(1 + Math.random() * 99);
      const orderNumber = `DCC-${dateKey}-${String(queueNumber).padStart(4, "0")}`;

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
      <DialogContent className="sm:max-w-2xl bg-[#100C29] border border-pink-500/30 text-white p-0 overflow-hidden shadow-2xl shadow-pink-950/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600/25 via-rose-900/20 to-[#100C29] px-6 pt-5 pb-4 border-b border-pink-500/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-300">
                Payment & Order Dispatch
              </span>
              <DialogTitle className="text-xl font-black text-white mt-0.5">
                Checkout — {customerName ? `for ${customerName}` : "New Order"}
              </DialogTitle>
              <DialogDescription className="text-xs text-pink-200/70">
                {orderType === "DINE_IN" ? "🌴 Dine-In Table Service" : "⚡ Takeaway Order"} · {lines.length} items
              </DialogDescription>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-pink-200/60 uppercase font-mono block">Grand Total</span>
              <span className="text-2xl font-black text-cyan-300 tabular-nums">
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
              { id: "QRIS", label: "QRIS Dynamic", icon: QrCode },
              { id: "DEBIT_EDC", label: "Debit / Card", icon: CreditCard },
            ].map((pm) => {
              const active = method === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setMethod(pm.id as PaymentMethod)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all duration-150 select-none",
                    active
                      ? "border-pink-400 bg-gradient-to-r from-pink-600/30 to-orange-500/30 text-white ring-1 ring-pink-400 shadow-lg shadow-pink-500/25"
                      : "border-pink-500/20 bg-[#0B081E] text-stone-300 hover:border-cyan-400/40 hover:text-white"
                  )}
                >
                  <pm.icon className={cn("w-5 h-5", active ? "text-cyan-300" : "text-stone-400")} />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: CASH */}
          {method === "CASH" && (
            <div className="space-y-4 rounded-2xl border border-pink-500/20 bg-[#0B081E] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-pink-200">
                  Quick Cash Tender
                </span>
                <span className="text-[11px] text-cyan-300 font-bold">Total: {formatRupiah(total)}</span>
              </div>

              {/* Quick cash pills */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTenderedStr(String(total))}
                  className="rounded-xl border border-cyan-400/50 bg-cyan-400/20 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/30 transition-all shadow-sm"
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
                      className="rounded-xl border border-pink-500/20 bg-[#140F33] py-2 text-xs font-semibold text-stone-200 hover:border-pink-400 hover:text-white transition-all"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
              </div>

              {/* Custom Cash Tendered input */}
              <div className="space-y-1.5 pt-2 border-t border-pink-500/20">
                <div className="flex justify-between text-xs">
                  <label htmlFor="tendered-input" className="font-bold text-pink-200">
                    Custom Cash Tendered (IDR)
                  </label>
                  <span className="font-mono text-cyan-300 font-bold">{formatRupiah(tendered)}</span>
                </div>
                <Input
                  id="tendered-input"
                  value={tenderedStr}
                  onChange={(e) => setTenderedStr(e.target.value)}
                  placeholder={`e.g. ${total}`}
                  className="h-11 text-base font-mono font-bold bg-[#100C29] border border-pink-500/30 text-cyan-300 focus:border-cyan-400"
                />
              </div>

              {/* Instant Change Calculator Box */}
              <div
                className={cn(
                  "flex items-center justify-between rounded-xl p-3.5 border transition-all",
                  isShort
                    ? "border-red-500/60 bg-red-950/30 text-red-300"
                    : "border-cyan-500/50 bg-cyan-950/30 text-cyan-300"
                )}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                    {isShort ? "Insufficient Cash" : "Change to Customer"}
                  </span>
                  <span className="text-xl font-black tabular-nums">
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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-pink-500/20 bg-[#0B081E] p-6 space-y-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 via-cyan-500/20 to-purple-500/20 border border-pink-500/40 text-cyan-300 shadow-lg shadow-pink-500/20">
                <QrCode className="w-8 h-8 text-cyan-300" />
              </div>

              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Kertas Print QRIS Meja Kasir
                </h4>
                <p className="text-xs text-pink-200/70 mt-1 max-w-sm">
                  Silakan arahkan pelanggan untuk scan lembaran cetak QRIS fisik yang ada di meja kasir.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#150F33] border border-cyan-400/40">
                  <span className="text-[11px] text-pink-200 uppercase font-bold">Total yang Harus Dibayar:</span>
                  <span className="font-mono text-base font-black text-cyan-300">{formatRupiah(total)}</span>
                </div>
              </div>

              {/* ACC & DECLINE Buttons */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-md pt-2">
                <button
                  type="button"
                  onClick={() => {
                    toast.error("Pembayaran QRIS dibatalkan atau belum diterima");
                  }}
                  className="flex flex-col items-center justify-center gap-1 py-3 px-4 rounded-xl border border-red-500/40 bg-red-950/20 hover:bg-red-950/40 text-red-300 font-bold transition-all text-xs"
                >
                  <div className="flex items-center gap-1.5 text-red-400 font-black">
                    <AlertTriangle className="w-4 h-4" />
                    <span>DECLINE / BATAL</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-normal">Dana belum masuk</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinishPayment}
                  className="flex flex-col items-center justify-center gap-1 py-3 px-4 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 text-white font-bold transition-all shadow-lg shadow-cyan-600/30 text-xs"
                >
                  <div className="flex items-center gap-1.5 font-black text-white">
                    <CheckCircle2 className="w-4 h-4 text-cyan-200" />
                    <span>ACC / BERHASIL</span>
                  </div>
                  <span className="text-[10px] text-cyan-100 font-normal">Kirim order ke barista</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DEBIT / EDC */}
          {method === "DEBIT_EDC" && (
            <div className="space-y-3.5 rounded-2xl border border-pink-500/20 bg-[#0B081E] p-4">
              <div className="text-xs text-pink-200">
                <p className="font-bold uppercase tracking-wider mb-1">Supported Card Networks</p>
                <div className="flex gap-2 flex-wrap">
                  {["BCA Card", "Mandiri Debit", "BRI", "BNI", "Visa / Mastercard"].map((card) => (
                    <span
                      key={card}
                      className="px-2.5 py-1 rounded-lg bg-[#140F33] border border-pink-500/30 text-[10px] text-cyan-300 font-mono font-bold"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-pink-500/20">
                <label htmlFor="edc-ref" className="text-xs font-bold text-pink-200">
                  EDC Trace / Approval Reference Number
                </label>
                <Input
                  id="edc-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. 482109 or RRN-98214"
                  className="h-10 text-xs font-mono bg-[#100C29] border border-pink-500/30 text-white focus:border-cyan-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-pink-500/20 bg-[#0B081E] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-pink-500/30 text-stone-300 hover:bg-pink-500/10 hover:text-white text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={isSubmitting || isShort}
            onClick={handleFinishPayment}
            className="bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-extrabold text-xs px-6 h-11 shadow-lg shadow-pink-600/40 transition-all hover:scale-[1.02]"
          >
            <span>Confirm Payment & Dispatch to Barista</span>
            <ArrowRight className="w-4 h-4 ml-1.5 text-cyan-300" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
