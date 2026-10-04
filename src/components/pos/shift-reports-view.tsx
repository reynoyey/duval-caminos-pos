"use client";

import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  Coffee,
  Receipt,
  CreditCard,
  QrCode,
  Banknote,
  TrendingUp,
  Percent,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatRupiah, formatDateTime } from "@/lib/utils";
import { useOrdersStore } from "@/stores/orders-store";
import { summarize } from "@/lib/summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DateRangeFilter = "TODAY" | "YESTERDAY" | "WEEK" | "CUSTOM";
type ShiftRangeFilter = "ALL" | "SHIFT_1" | "SHIFT_2";

export function ShiftReportsView() {
  const orders = useOrdersStore((s) => s.orders);
  const fetchLatestOrders = useOrdersStore((s) => s.fetchLatestOrders);
  const [isExporting, setIsExporting] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Auto fetch latest orders on mount
  useState(() => {
    fetchLatestOrders().catch(() => null);
  });

  // Current date in Jakarta timezone (YYYY-MM-DD)
  const getJakartaDateStr = (d: Date | string) => {
    try {
      const obj = typeof d === "string" ? new Date(d) : d;
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(obj);
    } catch {
      return new Date(d).toISOString().slice(0, 10);
    }
  };

  // Filters state
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>("TODAY");
  const [customDate, setCustomDate] = useState<string>(getJakartaDateStr(new Date()));
  const [shiftFilter, setShiftFilter] = useState<ShiftRangeFilter>("ALL");

  // Cash Reconciliation state - defaults to 0 as requested
  const [startingFloat, setStartingFloat] = useState<number>(0);
  const [countedCashStr, setCountedCashStr] = useState<string>("");

  // Filter orders according to date and shift range in Jakarta timezone
  const filteredOrders = useMemo(() => {
    const todayStr = getJakartaDateStr(new Date());

    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = getJakartaDateStr(yesterdayObj);

    const sevenDaysAgoObj = new Date();
    sevenDaysAgoObj.setDate(sevenDaysAgoObj.getDate() - 7);

    return orders.filter((o) => {
      const orderDateStr = getJakartaDateStr(o.createdAt);
      const orderTime = new Date(o.createdAt).getTime();

      // Date filtering
      if (dateFilter === "TODAY" && orderDateStr !== todayStr) return false;
      if (dateFilter === "YESTERDAY" && orderDateStr !== yesterdayStr) return false;
      if (dateFilter === "WEEK" && orderTime < sevenDaysAgoObj.getTime()) return false;
      if (dateFilter === "CUSTOM" && orderDateStr !== customDate) return false;

      // Shift filtering by hour in Jakarta timezone
      const orderDateObj = new Date(o.createdAt);
      const jakartaHour = Number(
        new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", hour: "numeric", hour12: false }).format(orderDateObj)
      );

      if (shiftFilter === "SHIFT_1" && (jakartaHour < 7 || jakartaHour >= 15)) return false;
      if (shiftFilter === "SHIFT_2" && (jakartaHour < 15 || jakartaHour >= 23)) return false;

      return true;
    });
  }, [orders, dateFilter, customDate, shiftFilter]);

  // Summarize filtered orders
  const summary = useMemo(() => {
    const formattedOrders = filteredOrders.map((o) => ({
      ...o,
      payments: (Array.isArray(o.payments) && o.payments.length > 0) ? o.payments : (o.payment ? [o.payment] : []),
    }));
    return summarize(formattedOrders, startingFloat);
  }, [filteredOrders, startingFloat]);

  // Cash Reconciliation calculation
  const countedCash = Number(countedCashStr.replace(/\D/g, "")) || 0;
  const cashDiscrepancy = countedCash > 0 ? countedCash - summary.cashOnHand : 0;

  const handleExportExcel = async () => {
    setIsExporting(true);
    toast.loading("Generating multi-sheet Excel workbook...", { id: "excel-export" });

    try {
      const targetOrders = filteredOrders.length > 0 ? filteredOrders : orders;
      const formattedOrders = targetOrders.map((o) => ({
        ...o,
        items: o.items || [],
        payments: (Array.isArray(o.payments) && o.payments.length > 0) ? o.payments : (o.payment ? [o.payment] : []),
      }));

      const res = await fetch("/api/reports/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: formattedOrders,
          summary: {
            ...summary,
            countedCash: countedCash > 0 ? countedCash : summary.cashOnHand,
            discrepancy: cashDiscrepancy,
          },
          cashierName: "Alex Rivera",
        }),
      });

      if (!res.ok) throw new Error("Failed to generate report");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Duval_Caminos_Shift_Report_${getJakartaDateStr(new Date())}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Excel report exported successfully!", { id: "excel-export" });
    } catch (err) {
      console.error(err);
      toast.error("Error generating Excel report", { id: "excel-export" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0E17] p-4 lg:p-6 overflow-y-auto no-scrollbar select-none text-white">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Shift Audit & Financial Recap</span>
            </h2>
            <span className="rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              {shiftFilter === "ALL" ? "All Shifts" : shiftFilter === "SHIFT_1" ? "Shift 1 Morning" : "Shift 2 Evening"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit register transactions, reconcile drawer cash, and export formatted Excel reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date & Shift Filter Modal Trigger */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsFilterModalOpen(true)}
            className="border-white/10 bg-[#161F30] text-slate-300 hover:bg-white/10 hover:text-white text-xs h-11 px-4"
          >
            <Filter className="w-4 h-4 mr-1.5 text-cyan-400" />
            <span>Filter Date & Shift Range</span>
          </Button>

          {/* Export Excel Button */}
          <Button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-11 px-5 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-white" />
            <span>{isExporting ? "Generating..." : "Export Shift Report (.xlsx)"}</span>
          </Button>
        </div>
      </div>

      {/* Active Filter Indicators */}
      <div className="flex flex-wrap items-center gap-2 py-3 text-xs text-slate-400">
        <span className="font-semibold text-white">Active Scope:</span>
        <span className="px-3 py-0.5 rounded-full bg-[#161F30] border border-white/10 text-cyan-400 font-mono text-[11px] font-bold">
          Date: {dateFilter} {dateFilter === "CUSTOM" && `(${customDate})`}
        </span>
        <span className="px-3 py-0.5 rounded-full bg-[#161F30] border border-white/10 text-rose-400 font-mono text-[11px] font-bold">
          Shift: {shiftFilter}
        </span>
        <span className="px-3 py-0.5 rounded-full bg-[#161F30] border border-white/10 text-slate-300 font-mono text-[11px]">
          {filteredOrders.length} Transactions Included
        </span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 my-3">
        {/* Total Sales */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#0E131F] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Grand Total Sales</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {formatRupiah(summary.totalSales)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Net Revenue: {formatRupiah(summary.netSales)}
          </p>
        </div>

        {/* Cups Sold */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#0E131F] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Beverage Cups Sold</span>
            <Coffee className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {summary.totalCups} <span className="text-sm font-normal text-slate-400">cups</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Total Items: {summary.totalItems} (inc. pastries)
          </p>
        </div>

        {/* Cash on Hand */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#0E131F] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Expected Cash Drawer</span>
            <Banknote className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {formatRupiah(summary.cashOnHand)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Opening Float: {formatRupiah(summary.openingCash)}
          </p>
        </div>

        {/* Orders Count & AOV */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#0E131F] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Average Ticket (AOV)</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {formatRupiah(summary.averageTicket)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            {summary.transactionCount} transactions settled
          </p>
        </div>
      </div>

      {/* Tender Reconcile & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-3">
        {/* Payment Methods */}
        <div className="rounded-xl border border-white/10 bg-[#0E131F] p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-cyan-400" />
            <span>Tender & Payment Method Breakdown</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-[#161F30]">
              <span className="flex items-center gap-2 text-slate-300">
                <Banknote className="w-4 h-4 text-emerald-400" /> Cash Tendered
              </span>
              <span className="font-mono font-bold text-white">{formatRupiah(summary.cashSales)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-[#161F30]">
              <span className="flex items-center gap-2 text-slate-300">
                <QrCode className="w-4 h-4 text-sky-400" /> QRIS Dynamic Sales
              </span>
              <span className="font-mono font-bold text-white">{formatRupiah(summary.qrisSales)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-[#161F30]">
              <span className="flex items-center gap-2 text-slate-300">
                <CreditCard className="w-4 h-4 text-purple-400" /> Debit EDC / Card Total
              </span>
              <span className="font-mono font-bold text-white">{formatRupiah(summary.debitSales)}</span>
            </div>
          </div>
        </div>

        {/* Order Types & Drawer Cash Reconciliation Box */}
        <div className="rounded-xl border border-white/10 bg-[#0E131F] p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
            <Percent className="w-4 h-4 text-cyan-400" />
            <span>Order Type & Drawer Reconciliation</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-[#161F30]">
              <span className="text-slate-300">Total Penjualan Dine-In</span>
              <span className="font-mono font-bold text-white">
                {formatRupiah(summary.dineInSales ?? (summary.totalSales - (summary.takeawaySales || 0)))}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-[#161F30]">
              <span className="text-slate-300">Total Penjualan Takeaway</span>
              <span className="font-mono font-bold text-white">
                {formatRupiah(summary.takeawaySales ?? 0)}
              </span>
            </div>

            <div
              className={cn(
                "flex items-center justify-between p-2.5 rounded-xl border",
                countedCash === 0
                  ? "border-white/10 bg-[#161F30] text-slate-400"
                  : cashDiscrepancy === 0
                  ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300 font-bold"
                  : "border-red-500/50 bg-red-950/20 text-red-300 font-bold"
              )}
            >
              <span>Cash Count Discrepancy</span>
              <span className="font-mono">
                {countedCash === 0
                  ? "Not counted yet"
                  : cashDiscrepancy === 0
                  ? "BALANCED (Rp0 variance)"
                  : `${cashDiscrepancy > 0 ? "+" : ""}${formatRupiah(cashDiscrepancy)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Preview Info Banner */}
      <div className="rounded-xl border border-white/10 bg-[#0E131F] p-4 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">
              Multi-Sheet Excel Report Engine (.xlsx)
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Includes 3 dedicated sheets: <strong>Sheet 1 (Shift Summary & Reconciliation)</strong>, <strong>Sheet 2 (Detailed Transaction Log)</strong>, and <strong>Sheet 3 (Ingredient Depletion: Oat milk liters & Extra shots)</strong>.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleExportExcel}
          disabled={isExporting}
          variant="outline"
          className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs shrink-0"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download .xlsx
        </Button>
      </div>

      {/* ==================================================================== */}
      {/* DETAILED TRANSACTION LOG TABLE                                       */}
      {/* ==================================================================== */}
      <div className="rounded-xl border border-white/10 bg-[#0E131F] p-5 my-4 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span>Daftar Transaksi Kasir Terdata ({filteredOrders.length} Pesanan)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Semua transaksi yang masuk dalam rekap dan diekspor ke file Excel (.xlsx).
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 font-bold">
            Total Penjualan: {formatRupiah(summary.totalSales)}
          </span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400 bg-[#161F30]">
                <th className="py-2.5 px-3">Ticket</th>
                <th className="py-2.5 px-3">ID Order</th>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Pelanggan</th>
                <th className="py-2.5 px-3">Tipe</th>
                <th className="py-2.5 px-3">Item Pesanan</th>
                <th className="py-2.5 px-3">Metode Bayar</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada transaksi pada filter tanggal/shift yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                      #{o.queueNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {o.orderNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {o.customerName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
                        {o.orderType === "DINE_IN" ? "Dine-in" : "Takeaway"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                      {o.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        o.payment?.method === "QRIS"
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : o.payment?.method === "CASH"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      )}>
                        {o.payment?.method || "CASH"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                      {formatRupiah(o.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* FILTER MODAL DIALOG: Date & Shift Range + Cash Reconciliation        */}
      {/* ==================================================================== */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#111726] border border-white/10 text-white p-0 overflow-hidden shadow-2xl shadow-black/80">
          <div className="bg-[#161F30] px-5 pt-4 pb-3 border-b border-white/10">
            <DialogTitle className="text-base font-bold text-white">
              Filter Shift & Cash Reconciliation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-0.5">
              Select date scope, shift window, and verify physical cash counted.
            </DialogDescription>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* 1. Date Range Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Date Range Scope
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "TODAY", label: "Today" },
                  { id: "YESTERDAY", label: "Yesterday" },
                  { id: "WEEK", label: "7 Days" },
                  { id: "CUSTOM", label: "Custom" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDateFilter(d.id as DateRangeFilter)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-semibold border transition",
                      dateFilter === d.id
                        ? "border-amber-500 bg-amber-600/20 text-amber-300 font-bold"
                        : "border-stone-800 bg-stone-950/60 text-stone-400 hover:text-stone-200"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {dateFilter === "CUSTOM" && (
                <div className="mt-2">
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="h-10 text-xs bg-stone-950 border-stone-800 text-stone-100"
                  />
                </div>
              )}
            </div>

            {/* 2. Shift Range Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Shift Range Window
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "ALL", label: "All Shifts", desc: "Full Day" },
                  { id: "SHIFT_1", label: "Morning", desc: "07:00 - 15:00" },
                  { id: "SHIFT_2", label: "Evening", desc: "15:00 - 23:00" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShiftFilter(s.id as ShiftRangeFilter)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition",
                      shiftFilter === s.id
                        ? "border-amber-500 bg-amber-600/20 text-amber-300 font-bold"
                        : "border-stone-800 bg-stone-950/60 text-stone-400 hover:text-stone-200"
                    )}
                  >
                    <span>{s.label}</span>
                    <span className="text-[10px] text-stone-500 font-normal">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Physical Cash Reconciliation */}
            <div className="pt-2 border-t border-stone-800 space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-300">
                Cash Drawer Physical Count & Float
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Opening Float (Modal Laci)</span>
                  <Input
                    type="number"
                    value={startingFloat}
                    onChange={(e) => setStartingFloat(Number(e.target.value) || 0)}
                    className="h-9 text-xs font-mono bg-[#161F30] border border-white/10 text-white mt-1"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-400">Counted Physical Cash</span>
                  <Input
                    type="text"
                    value={countedCashStr}
                    onChange={(e) => setCountedCashStr(e.target.value)}
                    placeholder="e.g. 500000"
                    className="h-9 text-xs font-mono bg-[#161F30] border border-white/10 text-white mt-1"
                  />
                </div>
              </div>

              {countedCashStr && (
                <div
                  className={cn(
                    "p-2.5 rounded-xl border text-xs flex items-center justify-between",
                    cashDiscrepancy === 0
                      ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                      : "border-red-500/50 bg-red-950/20 text-red-300"
                  )}
                >
                  <span>Reconciliation Status:</span>
                  <span className="font-bold font-mono">
                    {cashDiscrepancy === 0
                      ? "BALANCED (Zero Discrepancy)"
                      : `${cashDiscrepancy > 0 ? "Overage: +" : "Shortage: "}${formatRupiah(cashDiscrepancy)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-stone-800 bg-stone-950 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFilterModalOpen(false)}
              className="border-stone-800 text-stone-300 text-xs"
            >
              Close
            </Button>

            <Button
              type="button"
              onClick={() => {
                setIsFilterModalOpen(false);
                toast.success("Filter and cash reconciliation applied");
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5"
            >
              Apply Filter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
