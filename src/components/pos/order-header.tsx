"use client";

import type { Ref } from "react";
import { ShoppingBag, UtensilsCrossed, User, Hash, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import type { OrderType } from "@/lib/types";

const TYPES: { value: OrderType; label: string; sub: string; icon: typeof ShoppingBag }[] = [
  { value: "DINE_IN", label: "Dine-In", sub: "Table service", icon: UtensilsCrossed },
  { value: "TAKEAWAY", label: "Takeaway", sub: "To-go cup", icon: ShoppingBag },
];

export function OrderHeader({ nameRef, nameInvalid }: { nameRef: Ref<HTMLInputElement>; nameInvalid: boolean }) {
  const orderType = useCartStore((s) => s.orderType);
  const customerName = useCartStore((s) => s.customerName);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const setCustomerName = useCartStore((s) => s.setCustomerName);
  const setTableNumber = useCartStore((s) => s.setTableNumber);

  return (
    <section aria-label="Order Header" className="glass-miami flex items-stretch gap-3 rounded-2xl p-2.5 shadow-lg shadow-black/40">
      {/* Order Type Segmented Control (Miami Vibes) */}
      <div className="flex shrink-0 gap-1 rounded-xl bg-[#0D0A1F]/90 p-1 border border-pink-500/25">
        {TYPES.map((t) => {
          const active = orderType === t.value;
          return (
            <button
              key={t.value}
              id={`order-type-${t.value.toLowerCase()}`}
              onClick={() => setOrderType(t.value)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-4 py-2 text-left transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 text-white shadow-md shadow-pink-600/40"
                  : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
              )}
            >
              <t.icon className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-cyan-400")} />
              <span>
                <span className="block text-xs leading-tight font-extrabold tracking-tight">{t.label}</span>
                <span className={cn("block text-[10px] leading-tight", active ? "text-pink-100/90" : "text-stone-500")}>
                  {t.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Customer Name Input (Required - Neon Cyan Focus) */}
      <label
        className={cn(
          "flex flex-1 items-center gap-3 rounded-xl border bg-[#0D0A1F]/90 px-3.5 transition-all focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-400/30",
          nameInvalid
            ? "animate-shake border-red-500 ring-2 ring-red-500/40"
            : "border-pink-500/25"
        )}
      >
        <User className="w-4 h-4 shrink-0 text-cyan-400" />
        <span className="flex flex-1 flex-col justify-center py-1">
          <span className="text-[10px] font-extrabold tracking-wider text-pink-300 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1">
              Customer Name <span className="text-pink-400 font-black">*</span>
            </span>
            <span className="font-mono text-[9px] text-cyan-400/70 font-normal">Wajib untuk cup label</span>
          </span>
          <input
            ref={nameRef}
            id="customer-name"
            value={customerName}
            maxLength={40}
            autoComplete="off"
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Sarah, David, Liam..."
            className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-xs placeholder:font-normal placeholder:text-stone-500"
          />
        </span>
      </label>

      {/* Table / Pager ID (Optional) */}
      <label className="flex w-36 lg:w-44 shrink-0 items-center gap-2.5 rounded-xl border border-pink-500/25 bg-[#0D0A1F]/90 px-3 transition-all focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-400/30">
        <Hash className="w-4 h-4 shrink-0 text-orange-400" />
        <span className="flex flex-1 flex-col justify-center py-1">
          <span className="text-[10px] font-extrabold tracking-wider text-orange-300 uppercase">
            {orderType === "DINE_IN" ? "Table #" : "Pager ID"}
          </span>
          <input
            id="table-number"
            value={tableNumber}
            maxLength={10}
            autoComplete="off"
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Optional"
            className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-xs placeholder:font-normal placeholder:text-stone-500"
          />
        </span>
      </label>
    </section>
  );
}
