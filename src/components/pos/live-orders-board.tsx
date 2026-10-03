"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Flame,
  CheckCircle2,
  Clock,
  User,
  Coffee,
  Search,
  RotateCcw,
  Receipt,
  XCircle,
  Volume2,
  Tv,
  ChefHat,
  Maximize2,
  Minimize2,
  AlertTriangle,
  UtensilsCrossed,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatRupiah, formatDateTime } from "@/lib/utils";
import { useOrdersStore } from "@/stores/orders-store";
import { subscribeToOrders, isSupabaseConfigured } from "@/lib/supabase";
import type { OrderRecordDTO } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface Props {
  onViewReceipt: (order: OrderRecordDTO) => void;
}

type KdsViewMode = "BARISTA_KDS" | "CUSTOMER_TV";

/** Web Audio API chime generator for completed orders */
function playOrderReadyChime() {
  if (typeof window === "undefined" || !("AudioContext" in window || "webkitAudioContext" in window)) {
    return;
  }
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();

    const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Harmonious multi-bell chime (C5 - E5 - G5 - C6 chime)
    playTone(523.25, now, 0.4, 0.18);
    playTone(659.25, now + 0.12, 0.45, 0.2);
    playTone(783.99, now + 0.24, 0.5, 0.22);
    playTone(1046.5, now + 0.36, 0.7, 0.25);
  } catch (e) {
    console.warn("Audio chime playback error:", e);
  }
}

export function LiveOrdersBoard({ onViewReceipt }: Props) {
  const orders = useOrdersStore((s) => s.orders);
  const addOrder = useOrdersStore((s) => s.addOrder);
  const updateOrderStatus = useOrdersStore((s) => s.updateOrderStatus);
  const markCompleted = useOrdersStore((s) => s.markCompleted);
  const markProcessing = useOrdersStore((s) => s.markProcessing);
  const cancelOrder = useOrdersStore((s) => s.cancelOrder);
  const fetchLatestOrders = useOrdersStore((s) => s.fetchLatestOrders);

  const [viewMode, setViewMode] = useState<KdsViewMode>("BARISTA_KDS");
  const [searchQuery, setSearchQuery] = useState("");
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Background multi-device orders polling
  useEffect(() => {
    fetchLatestOrders().catch(() => null);
    const interval = setInterval(() => {
      fetchLatestOrders().catch(() => null);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchLatestOrders]);

  // Clock ticker for elapsed time calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real-time synchronization subscription (Supabase WebSockets + BroadcastChannel)
  useEffect(() => {
    const unsubscribe = subscribeToOrders((event) => {
      if (event.type === "ORDER_CREATED") {
        addOrder(event.order, false);
        toast.info(`New Order #${event.order.queueNumber} incoming (${event.order.customerName})`, {
          icon: "☕",
        });
      } else if (event.type === "ORDER_STATUS_CHANGED") {
        updateOrderStatus(event.orderId, event.status, false);
        if (event.status === "COMPLETED") {
          playOrderReadyChime();
        }
      }
    });

    return () => unsubscribe();
  }, [addOrder, updateOrderStatus]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCompleteOrder = (order: OrderRecordDTO) => {
    markCompleted(order.id);
    playOrderReadyChime();
    toast.success(`Order #${order.queueNumber} for ${order.customerName} is READY!`, {
      icon: "🔔",
    });
  };

  const handleReturnToBrewing = (orderId: string) => {
    markProcessing(orderId);
    toast.info("Order returned to brewing queue");
  };

  const handleVoidOrder = (order: OrderRecordDTO) => {
    if (confirm(`Void and cancel order #${order.queueNumber} (${order.customerName})?`)) {
      cancelOrder(order.id);
      toast.error(`Order #${order.queueNumber} voided`);
    }
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        String(o.queueNumber).includes(q) ||
        (o.tableNumber && o.tableNumber.toLowerCase().includes(q))
    );
  }, [orders, searchQuery]);

  const processingOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === "PROCESSING"),
    [filteredOrders]
  );

  const completedOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === "COMPLETED"),
    [filteredOrders]
  );

  // Helper: Elapsed time calculation & formatted label
  const getElapsedInfo = (createdAtIso: string) => {
    const elapsedMs = Math.max(0, nowTimestamp - new Date(createdAtIso).getTime());
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const isLate = mins >= 5; // Alert if waiting > 5 minutes

    const label = `${mins}m ${String(secs).padStart(2, "0")}s`;
    return { mins, secs, isLate, label };
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0E17] p-3 sm:p-4 lg:p-5 overflow-hidden select-none text-white">
      {/* ==================================================================== */}
      {/* Top Header & View Controls                                           */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Live Order Tracker & Kitchen Display</span>
              </h2>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/15 text-emerald-300 border-emerald-400/40 shadow-sm"
                title="Realtime Multi-Device Cloud Sync Aktif (Laptop, iPad, Smartphone, Kitchen Display)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Cloud Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sinkronisasi instan real-time layar POS Kasir, Barista KDS, dan Customer Counter TV.
            </p>
          </div>
        </div>

        {/* View Switcher, Audio Test & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Search box (in Barista mode) */}
          {viewMode === "BARISTA_KDS" && (
            <div className="relative w-48 sm:w-60">
              <Search className="pointer-events-none absolute top-1/2 left-3 w-3.5 h-3.5 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, name..."
                className="h-9 w-full rounded-xl border border-white/10 bg-[#161F30] pr-3 pl-8 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-medium"
              />
            </div>
          )}

          {/* Mode Switcher: Barista Prep vs Customer TV */}
          <div className="flex rounded-xl border border-white/10 bg-[#0E131F] p-1">
            <button
              type="button"
              onClick={() => setViewMode("BARISTA_KDS")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === "BARISTA_KDS"
                  ? "bg-[#1E293B] text-white border border-white/10 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Barista Prep Mode</span>
              <span className="sm:hidden">KDS</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("CUSTOMER_TV")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === "CUSTOMER_TV"
                  ? "bg-[#1E293B] text-white border border-white/10 shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer TV Display</span>
              <span className="sm:hidden">TV</span>
            </button>
          </div>

          {/* Test Audio Chime */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              playOrderReadyChime();
              toast.info("Order chime test played");
            }}
            className="border-white/10 bg-[#161F30] text-slate-300 hover:bg-white/10 hover:text-white h-9 px-2.5"
            title="Test Ready Chime Audio"
          >
            <Volume2 className="w-4 h-4 text-cyan-400" />
          </Button>

          {/* Fullscreen Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="border-white/10 bg-[#161F30] text-slate-300 hover:bg-white/10 hover:text-white h-9 px-2.5"
            title="Toggle Fullscreen Display"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
          </Button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* DUAL-VIEW INTERFACE                                                  */}
      {/* 1. Barista Prep Mode (KDS)                                           */}
      {/* 2. Customer Display Mode (TV Counter Screen)                         */}
      {/* ==================================================================== */}

      {viewMode === "BARISTA_KDS" ? (
        // --------------------------------------------------------------------
        // VIEW 1: BARISTA PREPARATION MODE (Kitchen Display System)
        // --------------------------------------------------------------------
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-h-0 pt-3 overflow-hidden">
          {/* ================================================================ */}
          {/* COLUMN 1: ON PROCESS / BREWING (Amber Accent)                    */}
          {/* ================================================================ */}
          <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-[#0E131F] overflow-hidden shadow-sm">
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#161F30] border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Flame className="w-4 h-4 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-300">
                    On Process / Brewing Queue
                  </h3>
                  <span className="text-[10px] text-stone-400">
                    Active drink preparation & barista tickets
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-amber-500 text-stone-950 shadow-md">
                  {processingOrders.length} in queue
                </span>
              </div>
            </div>

            {/* Orders Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
              {processingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-stone-500">
                  <div className="w-14 h-14 rounded-2xl border border-dashed border-stone-800 bg-stone-900/50 flex items-center justify-center mb-3">
                    <Coffee className="w-7 h-7 text-stone-600" />
                  </div>
                  <h4 className="text-sm font-bold text-stone-300">Barista Queue is Clear!</h4>
                  <p className="text-xs text-stone-500 max-w-56 mt-1">
                    All drinks have been prepared. Waiting for next ticket from cashier terminal.
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {processingOrders.map((order) => {
                    const elapsed = getElapsedInfo(order.createdAt);

                    return (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "relative rounded-2xl border p-4 transition-all shadow-md",
                          elapsed.isLate
                            ? "border-red-500/80 bg-gradient-to-br from-red-950/30 via-stone-900 to-stone-950 ring-1 ring-red-500/50 shadow-red-950/30 animate-pulse"
                            : "border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-stone-900/90 to-stone-950 shadow-amber-950/20"
                        )}
                      >
                        {/* Card Header: Ticket # & Customer Name */}
                        <div className="flex items-start justify-between border-b border-stone-800/80 pb-2.5">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-2xl font-black text-amber-400 tracking-tight">
                                #{order.queueNumber}
                              </span>
                              <span className="text-[10px] font-mono text-stone-500">
                                {order.orderNumber}
                              </span>
                            </div>
                            <h4 className="text-base font-extrabold text-stone-100 flex items-center gap-1.5 mt-0.5">
                              <User className="w-4 h-4 text-amber-400" />
                              <span>{order.customerName}</span>
                            </h4>
                          </div>

                          {/* Elapsed Timer & Alert */}
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-lg border",
                                elapsed.isLate
                                  ? "bg-red-500/20 text-red-300 border-red-500/40 animate-bounce"
                                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              )}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{elapsed.label}</span>
                            </span>

                            {elapsed.isLate && (
                              <span className="text-[10px] font-extrabold text-red-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> &gt; 5m Rush Alert!
                              </span>
                            )}

                            <span className="text-[10px] text-stone-400">
                              {order.orderType === "DINE_IN" ? (
                                <span className="text-amber-400 font-semibold flex items-center gap-1">
                                  <UtensilsCrossed className="w-3 h-3" /> Dine-In{" "}
                                  {order.tableNumber && `(#${order.tableNumber})`}
                                </span>
                              ) : (
                                <span className="text-stone-300 font-semibold flex items-center gap-1">
                                  <ShoppingBag className="w-3 h-3" /> Takeaway{" "}
                                  {order.tableNumber && `(${order.tableNumber})`}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Itemized Drink Prep List */}
                        <div className="py-2.5 space-y-2">
                          {order.items.map((it) => (
                            <div
                              key={it.id}
                              className="rounded-xl border border-stone-800/80 bg-stone-950/70 p-2.5 text-xs"
                            >
                              <div className="flex justify-between items-baseline font-bold text-stone-200">
                                <span className="text-sm">
                                  <span className="text-amber-400 font-black">{it.quantity}x</span>{" "}
                                  {it.productName}
                                </span>
                                <span className="font-mono text-[11px] text-stone-400">
                                  {formatRupiah(it.lineTotal)}
                                </span>
                              </div>

                              {/* Modifiers List Chips */}
                              {it.modifiers.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {it.modifiers.map((m) => (
                                    <span
                                      key={m.optionCode}
                                      className={cn(
                                        "rounded-md px-2 py-0.5 text-[10px] font-bold border",
                                        m.optionCode.includes("OAT") ||
                                          m.optionCode.includes("SHOT") ||
                                          m.optionCode.includes("SYRUP")
                                          ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
                                          : "bg-stone-800/90 text-stone-300 border-stone-700/60"
                                      )}
                                    >
                                      {m.groupName}: <strong>{m.optionName}</strong>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Barista Custom Note */}
                              {it.note && (
                                <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Note: {it.note}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Card Action: Mark Ready Button */}
                        <div className="flex items-center gap-2 pt-2 border-t border-stone-800">
                          <Button
                            type="button"
                            onClick={() => handleCompleteOrder(order)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs h-10 shadow-lg shadow-emerald-950/40"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            <span>Mark Completed / Ready for Pickup</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onViewReceipt(order)}
                            className="border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800 text-xs h-10 px-3"
                            title="Print Barista Cup Ticket"
                          >
                            <Receipt className="w-4 h-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleVoidOrder(order)}
                            className="text-stone-500 hover:text-red-400 hover:bg-red-950/20 text-xs h-10 px-2.5"
                            title="Void Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* COLUMN 2: COMPLETED / READY FOR PICKUP (Emerald Green Accent)    */}
          {/* ================================================================ */}
          <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-[#0E131F] overflow-hidden shadow-sm">
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#161F30] border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-300">
                    Completed / Ready for Pickup
                  </h3>
                  <span className="text-[10px] text-stone-400">
                    Drinks ready on pickup counter
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-emerald-500 text-stone-950 shadow-md">
                  {completedOrders.length} ready
                </span>
              </div>
            </div>

            {/* Orders Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
              {completedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-stone-500">
                  <CheckCircle2 className="w-12 h-12 text-stone-700 mb-3" />
                  <h4 className="text-sm font-bold text-stone-300">No Orders Waiting for Pickup</h4>
                  <p className="text-xs text-stone-500 max-w-56 mt-1">
                    Completed orders called out to customers will appear here.
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {completedOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl border border-emerald-500/30 bg-stone-900/80 p-4 transition-all shadow-md"
                    >
                      {/* Large Header for Pickup Calling */}
                      <div className="flex items-start justify-between border-b border-stone-800 pb-2.5">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-3xl font-black text-emerald-400 tracking-tight">
                              #{order.queueNumber}
                            </span>
                            <span className="text-[10px] font-mono text-stone-500">
                              {order.orderNumber}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-stone-100 mt-0.5">
                            {order.customerName}
                          </h4>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Ready for Pickup
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {formatDateTime(order.updatedAt || order.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Items Summary */}
                      <div className="py-2.5 text-xs text-stone-300 space-y-1">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex justify-between">
                            <span>
                              {it.quantity}x {it.productName}
                              {it.modifiers.length > 0 && (
                                <span className="text-stone-400 text-[10px] ml-1.5">
                                  ({it.modifiers.map((m) => m.optionName).join(", ")})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Return to Brewing action */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleReturnToBrewing(order.id)}
                          className="border-stone-800 bg-stone-900 text-stone-300 hover:bg-stone-800 text-xs h-8"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          <span>Return to Brewing</span>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewReceipt(order)}
                          className="text-stone-400 hover:text-stone-200 text-xs h-8"
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1.5" />
                          <span>Receipt</span>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      ) : (
        // --------------------------------------------------------------------
        // VIEW 2: CUSTOMER DISPLAY MODE (TV Counter Screen Mode)
        // Designed for large counter monitors / TVs with huge typography
        // --------------------------------------------------------------------
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 pt-3 overflow-hidden">
          {/* TV Column 1: ON PROCESS / SEDANG DISIAPKAN (Amber) */}
          <div className="flex flex-col h-full rounded-3xl border-2 border-amber-500/50 bg-[#14100D] p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b-2 border-amber-500/40">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Flame className="w-8 h-8 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-amber-400 uppercase tracking-widest">
                    Sedang Disiapkan
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 font-semibold">
                    Brewing & Preparation Queue
                  </p>
                </div>
              </div>
              <span className="font-mono text-2xl font-black px-4 py-1.5 rounded-xl bg-amber-500 text-stone-950">
                {processingOrders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pt-4 space-y-3">
              {processingOrders.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-stone-600">
                  <p className="text-lg font-bold">Semua pesanan sudah selesai diproses.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {processingOrders.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-2xl border border-amber-500/30 bg-stone-900/90 p-4 shadow-lg flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-3xl sm:text-4xl font-black text-amber-400">
                          #{o.queueNumber}
                        </span>
                        <span className="text-xs font-mono text-stone-500">
                          {o.orderType === "DINE_IN" ? "DINE-IN" : "TO-GO"}
                        </span>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-stone-100 truncate mt-2">
                        {o.customerName}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">
                        {o.items.reduce((s, it) => s + it.quantity, 0)} cup(s)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TV Column 2: COMPLETED / SILAKAN DIAMBIL (Emerald) */}
          <div className="flex flex-col h-full rounded-3xl border-2 border-emerald-500/60 bg-[#0B150F] p-5 shadow-2xl overflow-hidden ring-2 ring-emerald-500/20">
            <div className="flex items-center justify-between pb-4 border-b-2 border-emerald-500/40">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-emerald-400 uppercase tracking-widest">
                    Silakan Diambil
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-400 font-semibold">
                    Ready for Counter Collection
                  </p>
                </div>
              </div>
              <span className="font-mono text-2xl font-black px-4 py-1.5 rounded-xl bg-emerald-500 text-stone-950">
                {completedOrders.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pt-4 space-y-3">
              {completedOrders.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-stone-600">
                  <p className="text-lg font-bold">Belum ada pesanan siap diambil.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {completedOrders.map((o) => (
                    <motion.div
                      key={o.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-950/60 via-stone-900 to-stone-950 p-4 shadow-xl shadow-emerald-950/50 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-4xl sm:text-5xl font-black text-emerald-300 drop-shadow-md">
                          #{o.queueNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500 text-stone-950 text-[10px] font-extrabold uppercase">
                          PICKUP
                        </span>
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-white mt-2 truncate tracking-tight">
                        {o.customerName}
                      </h4>
                      <p className="text-xs text-emerald-400 font-semibold mt-1">
                        Silakan ambil di Counter Barista
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
