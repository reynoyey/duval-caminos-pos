"use client";

import { Minus, Plus, Trash2, Pencil, TicketPercent, ShoppingCart, X, Coffee, MessageSquareText } from "lucide-react";
import { cn, formatRupiah, isPastryOrFood } from "@/lib/utils";
import { useCartStore, useCartTotals, type CartLine } from "@/stores/cart-store";
import { TAX_RATE_PERCENT } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

interface Props {
  onEditLine: (line: CartLine) => void;
  onOpenDiscount: () => void;
  onCheckout: () => void;
  className?: string;
}

export function CartPanel({ onEditLine, onOpenDiscount, onCheckout, className }: Props) {
  const lines = useCartStore((s) => s.lines);
  const orderType = useCartStore((s) => s.orderType);
  const customerName = useCartStore((s) => s.customerName);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const discount = useCartStore((s) => s.discount);
  const lastTouched = useCartStore((s) => s.lastTouchedLineId);
  const { incrementQty, decrementQty, removeLine, clearDiscount, resetOrder } = useCartStore.getState();
  const t = useCartTotals();

  return (
    <aside
      aria-label="Order Cart"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111726] shadow-sm select-none",
        className
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-2.5 sm:gap-3 border-b border-white/10 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#0D121D] shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">
          <ShoppingCart className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold tracking-tight text-white uppercase">Order Cart</h2>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-white/10">
              {orderType === "DINE_IN" ? "Dine-In" : "Takeaway"}
            </span>
          </div>
          <p className="truncate text-xs text-slate-300 mt-0.5">
            {customerName ? (
              <span className="font-bold text-white">{customerName}</span>
            ) : (
              <span className="italic text-slate-500">Nama pelanggan belum diisi</span>
            )}
            {tableNumber && (
              <span className="text-slate-400 font-medium"> · {orderType === "DINE_IN" ? `#${tableNumber}` : tableNumber}</span>
            )}
          </p>
        </div>

        {lines.length > 0 && (
          <Button
            id="cart-clear"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 text-xs h-7 px-2 rounded-lg border border-white/10"
            onClick={() => confirm("Kosongkan keranjang pesanan ini?") && resetOrder()}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </header>

      {/* Cart Lines List */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center text-slate-400 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0D121D]">
              <Coffee className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-semibold text-white">Keranjang Masih Kosong</p>
            <p className="max-w-48 text-[11px] text-slate-400 leading-relaxed">
              Pilih menu kopi atau pastry di sebelah kiri untuk mulai membuat pesanan.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li
                key={l.lineId}
                className={cn(
                  "group rounded-xl border p-3 transition-all duration-150 shadow-sm",
                  l.lineId === lastTouched
                    ? "border-rose-500/50 bg-[#161F32]"
                    : "border-white/5 bg-[#151C2C] hover:border-white/15"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onEditLine(l)}
                    disabled={isPastryOrFood(l) || (l.modifiers.length === 0 && !l.isBeverage)}
                    title={isPastryOrFood(l) ? undefined : "Klik untuk ubah modifier"}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {l.productName}
                      </span>
                      {!isPastryOrFood(l) && (l.modifiers.length > 0 || l.isBeverage) && (
                        <Pencil className="w-3 h-3 text-slate-400 opacity-70 group-hover:opacity-100" />
                      )}
                    </div>

                    {/* Modifiers Badges */}
                    {l.modifiers.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {l.modifiers.map((m) => (
                          <span
                            key={m.optionId}
                            className={cn(
                              "rounded-md px-1.5 py-0.2 text-[9px] font-medium border",
                              m.priceDelta > 0
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                : "bg-white/5 text-slate-300 border-white/10"
                            )}
                          >
                            {m.optionName}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Barista Custom Note */}
                    {l.note && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-cyan-300 font-medium italic">
                        <MessageSquareText className="w-3 h-3 shrink-0 text-cyan-400" />
                        <span className="truncate">"{l.note}"</span>
                      </div>
                    )}
                  </button>

                  {/* Quantity Stepper & Price */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-white tabular-nums font-mono">
                      {formatRupiah(l.unitPrice * l.quantity)}
                    </span>

                    <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#0D121D] p-0.5">
                      <button
                        type="button"
                        onClick={() => decrementQty(l.lineId)}
                        className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-4 text-center font-mono text-xs font-bold text-white">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => incrementQty(l.lineId)}
                        className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(l.lineId)}
                        className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-rose-950/60 hover:text-rose-300 ml-0.5 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bill Breakdown & Pay Action */}
      <footer className="border-t border-white/10 bg-[#0D121D] p-3 sm:p-4 space-y-2.5 sm:space-y-3 shrink-0">
        {/* Subtotal & Discount row */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal ({t.itemCount} items)</span>
            <span className="font-bold text-white tabular-nums font-mono">{formatRupiah(t.subtotal)}</span>
          </div>

          {/* Discount Pill */}
          <div className="flex items-center justify-between">
            {discount.type !== "NONE" ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                  <TicketPercent className="w-3 h-3 text-rose-400" />
                  {discount.label || discount.code || "Promo"}
                </span>
                <button
                  type="button"
                  onClick={clearDiscount}
                  className="text-slate-400 hover:text-rose-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenDiscount}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <TicketPercent className="w-3.5 h-3.5 text-slate-400" />
                <span>+ Promo / Voucher Diskon</span>
              </button>
            )}

            {discount.type !== "NONE" && (
              <span className="font-bold text-emerald-400 tabular-nums font-mono">
                -{formatRupiah(t.discountAmount)}
              </span>
            )}
          </div>

          {/* Tax row (if applicable) */}
          {t.taxAmount > 0 && (
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Pajak Restoran (PB1 {TAX_RATE_PERCENT}%)</span>
              <span className="tabular-nums font-mono text-slate-300">{formatRupiah(t.taxAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex items-baseline justify-between border-t border-white/10 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Total Pembayaran
            </span>
            <span className="text-xl font-bold text-white tabular-nums font-mono">
              {formatRupiah(t.total)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          id="btn-checkout"
          disabled={lines.length === 0}
          onClick={onCheckout}
          className="btn-miami w-full h-11 rounded-xl flex items-center justify-center gap-2 text-white font-bold text-xs tracking-wide disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer"
        >
          <span>Bayar & Proses Pesanan</span>
          <span className="font-mono text-xs opacity-90 font-bold">({formatRupiah(t.total)})</span>
        </button>
      </footer>
    </aside>
  );
}
