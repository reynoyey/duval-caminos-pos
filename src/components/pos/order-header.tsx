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
    <section aria-label="Order Header" className="flex items-stretch gap-2 sm:gap-2.5 rounded-2xl p-2 bg-[#101522] border border-white/10 shadow-sm shrink-0">
      {/* Order Type Segmented Control */}
      <div className="flex shrink-0 gap-1 rounded-xl bg-[#0D121D] p-1 border border-white/10">
        {TYPES.map((t) => {
          const active = orderType === t.value;
          return (
            <button
              key={t.value}
              id={`order-type-${t.value.toLowerCase()}`}
              onClick={() => setOrderType(t.value)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-left transition-all duration-150",
                active
                  ? "bg-[#1E293B] text-white shadow-sm border border-white/10"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <t.icon className={cn("w-3.5 h-3.5 shrink-0", active ? "text-rose-400" : "text-slate-400")} />
              <span>
                <span className="block text-xs leading-tight font-bold tracking-tight">{t.label}</span>
                <span className={cn("block text-[10px] leading-tight hidden sm:block", active ? "text-slate-300" : "text-slate-500")}>
                  {t.sub}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Customer Name Input */}
      <label
        className={cn(
          "flex flex-1 items-center gap-2 sm:gap-2.5 rounded-xl border bg-[#0D121D] px-2.5 sm:px-3.5 transition-all focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30 min-w-0",
          nameInvalid
            ? "animate-shake border-red-500 ring-2 ring-red-500/40"
            : "border-white/10"
        )}
      >
        <User className="w-4 h-4 shrink-0 text-slate-400" />
        <span className="flex flex-1 flex-col justify-center py-1 min-w-0">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
            <span className="flex items-center gap-1">
              Customer Name <span className="text-rose-400 font-bold">*</span>
            </span>
            <span className="font-mono text-[9px] text-slate-500 font-normal hidden md:inline">Wajib untuk cup</span>
          </span>
          <input
            ref={nameRef}
            id="customer-name"
            value={customerName}
            maxLength={40}
            autoComplete="off"
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Sarah, David, Liam..."
            className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-xs placeholder:font-normal placeholder:text-slate-500"
          />
        </span>
      </label>

      {/* Table / Pager ID */}
      <label className="flex w-24 sm:w-28 lg:w-36 shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl border border-white/10 bg-[#0D121D] px-2.5 sm:px-3 transition-all focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/20">
        <Hash className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="flex flex-1 flex-col justify-center py-1 min-w-0">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase truncate">
            {orderType === "DINE_IN" ? "Table #" : "Pager"}
          </span>
          <input
            id="table-number"
            value={tableNumber}
            maxLength={10}
            autoComplete="off"
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="No."
            className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-xs placeholder:font-normal placeholder:text-slate-500"
          />
        </span>
      </label>
    </section>
  );
}
