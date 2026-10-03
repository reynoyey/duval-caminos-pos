"use client";

import { Minus, Plus, Trash2, Pencil, TicketPercent, ShoppingCart, X, Coffee, MessageSquareText } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
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
        "glass-miami sticky top-0 flex h-full w-full lg:w-[35%] shrink-0 flex-col overflow-hidden rounded-3xl border border-pink-500/25 bg-[#100C29]/95 shadow-2xl select-none",
        className
      )}
    >
      {/* Header (Miami Vibes) */}
      <header className="flex items-center gap-3 border-b border-pink-500/20 px-5 py-4 bg-[#140F33]/80">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 text-white shadow-md shadow-pink-500/40">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black tracking-tight text-white uppercase">Order Cart</h2>
            <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300 border border-cyan-400/40">
              {orderType === "DINE_IN" ? "🌴 Dine-In" : "⚡ Takeaway"}
            </span>
          </div>
          <p className="truncate text-xs text-stone-300 mt-0.5">
            {customerName ? (
              <span className="font-extrabold text-cyan-300">{customerName}</span>
            ) : (
              <span className="italic text-stone-500">Nama pelanggan belum diisi</span>
            )}
            {tableNumber && <span className="text-pink-300 font-bold"> · #{tableNumber}</span>}
          </p>
        </div>

        {lines.length > 0 && (
          <Button
            id="cart-clear"
            variant="ghost"
            size="sm"
            className="text-pink-300 hover:text-white hover:bg-pink-900/30 text-xs h-8 px-2.5 rounded-lg border border-pink-500/20"
            onClick={() => confirm("Kosongkan keranjang pesanan ini?") && resetOrder()}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </header>

      {/* Cart Lines List */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-stone-400 p-6">
            <div className="flex h-18 w-18 items-center justify-center rounded-3xl border border-dashed border-pink-500/30 bg-[#161038]/60 shadow-inner">
              <Coffee className="w-8 h-8 text-pink-400/70" />
            </div>
            <p className="text-sm font-bold text-white">Keranjang Masih Kosong</p>
            <p className="max-w-48 text-[11px] text-pink-200/50 leading-relaxed">
              Pilih menu kopi atau pastry di sebelah kiri untuk mulai membuat pesanan.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {lines.map((l) => (
              <li
                key={l.lineId}
                className={cn(
                  "group rounded-2xl border p-3 transition-all duration-150 shadow-sm",
                  l.lineId === lastTouched
                    ? "border-pink-500/80 bg-gradient-to-r from-pink-950/40 to-purple-950/40 ring-1 ring-pink-500/50 shadow-pink-500/20"
                    : "border-pink-500/15 bg-[#151036]/70 hover:border-cyan-400/40"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onEditLine(l)}
                    disabled={l.modifiers.length === 0 && !l.isBeverage}
                    title="Klik untuk ubah modifier"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                        {l.productName}
                      </span>
                      {(l.modifiers.length > 0 || l.isBeverage) && (
                        <Pencil className="w-3 h-3 text-pink-400 opacity-70 group-hover:opacity-100" />
                      )}
                    </div>

                    {/* Modifiers Badges (Neon Miami Pills) */}
                    {l.modifiers.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {l.modifiers.map((m) => (
                          <span
                            key={m.optionId}
                            className={cn(
                              "rounded-md px-1.5 py-0.2 text-[9px] font-bold border",
                              m.priceDelta > 0
                                ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                                : "bg-[#21184E] text-stone-300 border-purple-500/20"
                            )}
                          >
                            {m.optionName}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Barista Custom Note */}
                    {l.note && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-cyan-300 font-semibold italic">
                        <MessageSquareText className="w-3 h-3 shrink-0 text-cyan-400" />
                        <span className="truncate">"{l.note}"</span>
                      </div>
                    )}
                  </button>

                  {/* Quantity Stepper & Price */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-black text-cyan-300 tabular-nums">
                      {formatRupiah(l.unitPrice * l.quantity)}
                    </span>

                    <div className="flex items-center gap-1 rounded-xl border border-pink-500/25 bg-[#0D0924] p-0.5">
                      <button
                        type="button"
                        onClick={() => decrementQty(l.lineId)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-stone-300 hover:bg-pink-600 hover:text-white transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-mono text-xs font-black text-white">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => incrementQty(l.lineId)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-stone-300 hover:bg-cyan-500 hover:text-black transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(l.lineId)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-pink-400 hover:bg-red-950/60 hover:text-red-300 ml-0.5 transition-colors"
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
      <footer className="border-t border-pink-500/20 bg-[#130E30]/95 p-4 space-y-3">
        {/* Subtotal & Discount row */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-300">
            <span>Subtotal ({t.itemCount} items)</span>
            <span className="font-bold text-white tabular-nums">{formatRupiah(t.subtotal)}</span>
          </div>

          {/* Discount Pill */}
          <div className="flex items-center justify-between">
            {discount.type !== "NONE" ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-pink-500/25 to-orange-500/25 px-2 py-0.5 text-[10px] font-black text-pink-300 border border-pink-500/40">
                  <TicketPercent className="w-3 h-3 text-cyan-400" />
                  {discount.label || discount.code || "Promo"}
                </span>
                <button
                  type="button"
                  onClick={clearDiscount}
                  className="text-stone-400 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenDiscount}
                className="text-[11px] font-extrabold text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
              >
                <TicketPercent className="w-3.5 h-3.5 text-pink-400" />
                <span>+ Promo / Voucher Diskon</span>
              </button>
            )}

            {discount.type !== "NONE" && (
              <span className="font-bold text-cyan-400 tabular-nums">
                -{formatRupiah(t.discountAmount)}
              </span>
            )}
          </div>

          {/* Tax row (if applicable) */}
          {t.taxAmount > 0 && (
            <div className="flex justify-between text-stone-400 text-[11px]">
              <span>Pajak Restoran (PB1 {TAX_RATE_PERCENT}%)</span>
              <span className="tabular-nums font-mono text-stone-300">{formatRupiah(t.taxAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex items-baseline justify-between border-t border-pink-500/20 pt-2">
            <span className="text-xs font-black uppercase tracking-wider text-pink-300">
              Total Pembayaran
            </span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-orange-300 to-cyan-300 tabular-nums">
              {formatRupiah(t.total)}
            </span>
          </div>
        </div>

        {/* Big Miami Vibes Checkout Button */}
        <button
          id="btn-checkout"
          disabled={lines.length === 0}
          onClick={onCheckout}
          className="btn-miami w-full h-13 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-sm tracking-wide disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer"
        >
          <span>Bayar & Proses Pesanan</span>
          <span className="font-mono text-xs opacity-90 font-black">({formatRupiah(t.total)})</span>
        </button>
      </footer>
    </aside>
  );
}
