"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Coffee, Flame, Utensils, FileSpreadsheet, Clock, User, Sparkles, Sun, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrdersStore } from "@/stores/orders-store";
import { useMenuStore } from "@/stores/menu-store";
import { useSettingsStore } from "@/stores/settings-store";

export type PosTab = "REGISTER" | "ORDERS_QUEUE" | "MENU_MANAGER" | "REPORTS";

interface TopBarProps {
  activeTab: PosTab;
  onTabChange: (tab: PosTab) => void;
  cashierName?: string;
  onOpenSettings?: () => void;
}

export function TopBar({ activeTab, onTabChange, cashierName: propCashier, onOpenSettings }: TopBarProps) {
  const [currentTime, setCurrentTime] = useState("");
  const orders = useOrdersStore((s) => s.orders);
  const products = useMenuStore((s) => s.products);

  const storedCashier = useSettingsStore((s) => s.cashierName);
  const storeName = useSettingsStore((s) => s.storeName);
  const storeTagline = useSettingsStore((s) => s.storeTagline);
  const logoUrl = useSettingsStore((s) => s.logoUrl);

  const activeCashier = storedCashier || propCashier || "Alex Rivera";
  const processingCount = orders.filter((o) => o.status === "PROCESSING").length;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(now)
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const nameWords = storeName.split(" ");
  const firstWord = nameWords[0] || "Duval";
  const restWords = nameWords.slice(1).join(" ") || "Caminos Coffee";

  return (
    <header className="h-16 border-b border-pink-500/20 bg-[#0E0B1F]/90 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 select-none z-30 shadow-lg shadow-black/40">
      {/* Brand & Miami Sunset Concept */}
      <div className="flex items-center gap-3">
        <div
          onClick={onOpenSettings}
          className="relative w-10 h-10 rounded-xl overflow-hidden ring-2 ring-pink-500/50 bg-[#161033] flex items-center justify-center shadow-lg shadow-pink-500/25 cursor-pointer hover:ring-cyan-400 transition-all"
          title="Klik untuk ganti logo di Settings"
        >
          <Image
            src={logoUrl || "/logo.jpg"}
            alt={storeName}
            fill
            className="object-cover"
            priority
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              <span>{firstWord}</span>
              <span className="text-gradient-miami font-extrabold">{restWords}</span>
            </h1>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20">
              🌴 MIAMI VIBES
            </span>
          </div>
          <p className="text-[11px] text-pink-200/60 font-medium">{storeTagline}</p>
        </div>
      </div>

      {/* Main Mode Navigation Tabs (Miami Neon Styled) */}
      <nav className="flex items-center bg-[#130E29]/90 p-1.5 rounded-2xl border border-pink-500/25 shadow-inner">
        <button
          type="button"
          onClick={() => onTabChange("REGISTER")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200",
            activeTab === "REGISTER"
              ? "bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 text-white shadow-md shadow-pink-600/40"
              : "text-stone-300 hover:text-white hover:bg-white/10"
          )}
        >
          <Coffee className="w-4 h-4 text-cyan-300" />
          <span>POS Register</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("ORDERS_QUEUE")}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200",
            activeTab === "ORDERS_QUEUE"
              ? "bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 text-white shadow-md shadow-pink-600/40"
              : "text-stone-300 hover:text-white hover:bg-white/10"
          )}
        >
          <Flame className={cn("w-4 h-4", processingCount > 0 ? "text-cyan-300 animate-pulse" : "")} />
          <span>Live Orders</span>
          {processingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-cyan-400 text-black shadow-sm animate-bounce">
              {processingCount} Brewing
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange("MENU_MANAGER")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200",
            activeTab === "MENU_MANAGER"
              ? "bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 text-white shadow-md shadow-pink-600/40"
              : "text-stone-300 hover:text-white hover:bg-white/10"
          )}
        >
          <Utensils className="w-4 h-4 text-cyan-300" />
          <span>Menu Manager</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-pink-500/20 text-pink-300 font-extrabold border border-pink-500/30">
            Add/Hapus ({products.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("REPORTS")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200",
            activeTab === "REPORTS"
              ? "bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 text-white shadow-md shadow-pink-600/40"
              : "text-stone-300 hover:text-white hover:bg-white/10"
          )}
        >
          <FileSpreadsheet className="w-4 h-4 text-green-300" />
          <span>Reports & Excel</span>
        </button>
      </nav>

      {/* Cashier, Settings & Live Digital Clock */}
      <div className="flex items-center gap-2.5">
        {/* Cashier Badge (Clickable to change name) */}
        <div
          onClick={onOpenSettings}
          className="cursor-pointer hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#140F2E] border border-cyan-500/30 hover:border-cyan-400 text-xs shadow-sm transition-all"
          title="Klik untuk ganti nama kasir di Settings"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
          <User className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-white font-bold">{activeCashier}</span>
          <span className="text-purple-400">|</span>
          <span className="text-gradient-sunset font-black">Shift #01</span>
        </div>

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-500/30 bg-[#161033] hover:bg-pink-500/20 text-stone-200 hover:text-white text-xs font-bold transition-all shadow-sm"
            title="Pengaturan Kasir, Logo Toko & Reset Order"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        )}

        {/* Digital Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#140F2E] border border-pink-500/30 text-cyan-300 font-mono text-xs shadow-sm glow-cyan">
          <Clock className="w-3.5 h-3.5 text-pink-400" />
          <span className="tracking-wider font-extrabold">{currentTime || "--:--:--"}</span>
        </div>
      </div>
    </header>
  );
}
