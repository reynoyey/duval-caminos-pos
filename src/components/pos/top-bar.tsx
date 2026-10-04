"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Coffee, Flame, Utensils, FileSpreadsheet, Clock, User, Sparkles, Sun, Settings, Lock } from "lucide-react";
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
  onLockTerminal?: () => void;
}

export function TopBar({ activeTab, onTabChange, cashierName: propCashier, onOpenSettings, onLockTerminal }: TopBarProps) {
  const [currentTime, setCurrentTime] = useState("");
  const orders = useOrdersStore((s) => s.orders);
  const products = useMenuStore((s) => s.products);

  const storedCashier = useSettingsStore((s) => s.cashierName);
  const storeName = useSettingsStore((s) => s.storeName);
  const storeTagline = useSettingsStore((s) => s.storeTagline);
  const logoUrl = useSettingsStore((s) => s.logoUrl);

  const activeCashier = storedCashier || propCashier || "Alex Rivera";
  const processingCount = orders.filter((o) => o.status === "PROCESSING").length;
  const readyCount = orders.filter((o) => o.status === "COMPLETED" && !o.isCollected).length;
  const totalActiveOrders = processingCount + readyCount;

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
    <header className="h-14 border-b border-white/10 bg-[#0E131F]/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-30 shadow-sm gap-2">
      {/* Brand */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div
          onClick={onOpenSettings}
          className="relative w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10 bg-[#161D2B] flex items-center justify-center cursor-pointer hover:ring-rose-500/50 transition-all shadow-sm shrink-0"
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
        <div className="min-w-0">
          <h1 className="font-heading text-xs sm:text-sm md:text-base font-bold tracking-tight text-white leading-tight truncate max-w-[130px] sm:max-w-[200px] md:max-w-none">
            {storeName}
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-tight mt-0.5 hidden xl:block truncate max-w-[240px]">
            {storeTagline}
          </p>
        </div>
      </div>

      {/* Main Mode Navigation Tabs */}
      <nav className="flex items-center bg-[#111726] p-1 rounded-xl border border-white/10 shadow-sm shrink-0">
        <button
          type="button"
          onClick={() => onTabChange("REGISTER")}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
            activeTab === "REGISTER"
              ? "bg-[#1E293B] text-white shadow-sm border border-white/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Coffee className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="hidden md:inline">POS Register</span>
          <span className="md:hidden">Register</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("ORDERS_QUEUE")}
          className={cn(
            "relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
            activeTab === "ORDERS_QUEUE"
              ? "bg-[#1E293B] text-white shadow-sm border border-white/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Flame className={cn("w-3.5 h-3.5 shrink-0", totalActiveOrders > 0 ? "text-cyan-400" : "text-slate-400")} />
          <span className="hidden md:inline">Live Orders</span>
          <span className="md:hidden">Orders</span>
          {totalActiveOrders > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {totalActiveOrders}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange("MENU_MANAGER")}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
            activeTab === "MENU_MANAGER"
              ? "bg-[#1E293B] text-white shadow-sm border border-white/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Utensils className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden md:inline">Menu Manager</span>
          <span className="md:hidden">Menu</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 text-slate-300 font-medium">
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("REPORTS")}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
            activeTab === "REPORTS"
              ? "bg-[#1E293B] text-white shadow-sm border border-white/10"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden md:inline">Reports & Excel</span>
          <span className="md:hidden">Reports</span>
        </button>
      </nav>

      {/* Cashier, Settings & Live Digital Clock */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Realtime Multi-Device Sync Indicator */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium shadow-sm select-none"
          title="Sinkronisasi multi-device realtime aktif (iPad, Laptop, Smartphone, Kitchen TV terhubung otomatis)"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold">Live Sync</span>
        </div>

        {/* Cashier Badge */}
        <div
          onClick={onOpenSettings}
          className="cursor-pointer hidden md:flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#111726] border border-white/10 hover:border-white/20 text-xs shadow-sm transition-all"
          title="Klik untuk ganti nama kasir di Settings"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shrink-0" />
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-white font-medium truncate max-w-[90px] sm:max-w-none">{activeCashier}</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">Shift #01</span>
        </div>

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-white/10 bg-[#111726] hover:bg-[#182032] text-slate-300 hover:text-white text-xs font-medium transition-all shadow-sm"
            title="Pengaturan Kasir, Logo Toko & Reset Order"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        )}

        {/* Lock Terminal Button */}
        {onLockTerminal && (
          <button
            type="button"
            onClick={onLockTerminal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all shadow-sm"
            title="Kunci Layar Terminal POS"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Kunci</span>
          </button>
        )}

        {/* Digital Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#111726] border border-white/10 text-slate-300 font-mono text-xs shadow-sm">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="tracking-wider font-semibold">{currentTime || "--:--:--"}</span>
        </div>
      </div>
    </header>
  );
}
