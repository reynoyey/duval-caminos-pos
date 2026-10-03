"use client";

import { useState, useRef } from "react";
import { Printer, Check, Coffee, ReceiptText, Sparkles, X } from "lucide-react";
import { cn, formatRupiah, formatDateTime } from "@/lib/utils";
import type { OrderRecordDTO } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings-store";

interface Props {
  order: OrderRecordDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ order, open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState<"CUSTOMER" | "BARISTA">("CUSTOMER");
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const printAreaRef = useRef<HTMLDivElement>(null);

  const storeName = useSettingsStore((s) => s.storeName);
  const storeAddress = useSettingsStore((s) => s.storeAddress);
  const cashierName = useSettingsStore((s) => s.cashierName);

  if (!order) return null;

  const handlePrint = () => {
    const el = printAreaRef.current;
    if (!el) {
      window.print();
      return;
    }

    // Remove old print iframe if any
    const oldIframe = document.getElementById("thermal-print-frame");
    if (oldIframe) oldIframe.remove();

    // Create an isolated iframe for instant, crystal-clear thermal printing
    const iframe = document.createElement("iframe");
    iframe.id = "thermal-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const is58 = paperWidth === "58mm";
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt #${order.orderNumber}</title>
          <style>
            @page {
              margin: 0;
              size: ${is58 ? "58mm auto" : "80mm auto"};
            }
            *, *::before, *::after {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
              width: ${is58 ? "48mm" : "72mm"};
              margin: 0 auto;
              padding: 4mm 2mm;
              color: #000000;
              background: #ffffff;
              font-size: ${is58 ? "9px" : "11px"};
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-extrabold { font-weight: 800; }
            .font-mono { font-family: monospace, "Courier New"; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .border-b { border-bottom: 1px solid #000; }
            .border-t { border-top: 1px solid #000; }
            .border-dashed { border-style: dashed !important; border-color: #555 !important; }
            .pb-1 { padding-bottom: 4px; }
            .pb-2 { padding-bottom: 8px; }
            .pt-1 { padding-top: 4px; }
            .pt-2 { padding-top: 8px; }
            .space-y-0\\.5 > * + * { margin-top: 2px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-2 > * + * { margin-top: 8px; }
            .space-y-3 > * + * { margin-top: 12px; }
            .text-xs { font-size: ${is58 ? "8px" : "10px"}; }
            .text-sm { font-size: ${is58 ? "10px" : "12px"}; }
            .text-base { font-size: ${is58 ? "12px" : "14px"}; }
            .text-lg { font-size: ${is58 ? "14px" : "16px"}; }
            .text-xl { font-size: ${is58 ? "16px" : "20px"}; }
            .text-2xl { font-size: ${is58 ? "18px" : "24px"}; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tabular-nums { font-variant-numeric: tabular-nums; }
            .text-stone-500, .text-stone-600, .text-stone-700 { color: #333333; }
            .bg-stone-100 { background: #f2f2f2; }
            .bg-amber-100 { background: #fef3c7; }
            .border-stone-300 { border-color: #cccccc; }
            .border-stone-400 { border-color: #888888; }
            .rounded { border-radius: 3px; }
            .p-1 { padding: 4px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          </style>
        </head>
        <body>
          ${el.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#111726] border border-white/10 text-white p-0 overflow-hidden shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="bg-[#161F30] px-5 pt-4 pb-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-rose-400" />
            <div>
              <DialogTitle className="text-base font-bold text-white">Thermal Ticket Preview</DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400">
                Order #{order.orderNumber} · Ticket #{order.queueNumber}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Roll Width Toggle */}
            <div className="flex rounded-xl border border-white/10 bg-[#0E131F] p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setPaperWidth("58mm")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-bold transition",
                  paperWidth === "58mm" ? "bg-[#1E293B] text-white border border-white/10 shadow-sm" : "text-slate-400 hover:text-white"
                )}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth("80mm")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-bold transition",
                  paperWidth === "80mm" ? "bg-[#1E293B] text-white border border-white/10 shadow-sm" : "text-slate-400 hover:text-white"
                )}
              >
                80mm
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl border border-white/10 bg-[#0E131F] p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("CUSTOMER")}
                className={cn(
                  "rounded-lg px-3 py-1 text-[11px] font-bold transition",
                  activeTab === "CUSTOMER" ? "bg-[#1E293B] text-white border border-white/10 shadow-sm" : "text-slate-400 hover:text-white"
                )}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("BARISTA")}
                className={cn(
                  "rounded-lg px-3 py-1 text-[11px] font-bold transition",
                  activeTab === "BARISTA" ? "bg-[#1E293B] text-white border border-white/10 shadow-sm" : "text-slate-400 hover:text-white"
                )}
              >
                Barista Cup
              </button>
            </div>
          </div>
        </div>

        {/* Printable Ticket Simulation Container */}
        <div className="p-4 bg-[#0E131F] flex justify-center max-h-[70vh] overflow-y-auto no-scrollbar">
          <div
            ref={printAreaRef}
            id="thermal-receipt"
            className={cn(
              "bg-white text-stone-950 p-4 rounded-lg shadow-inner font-mono border border-stone-300 transition-all",
              paperWidth === "58mm"
                ? "w-[240px] text-[10px] thermal-58mm"
                : "w-[330px] text-xs thermal-80mm"
            )}
          >
            {activeTab === "CUSTOMER" ? (
              // -------------------------------------------------------------
              // CUSTOMER RECEIPT (58mm / 80mm format)
              // -------------------------------------------------------------
              <div className="space-y-3">
                <div className="text-center pb-2 border-b border-dashed border-stone-400">
                  <h3 className="font-extrabold text-sm tracking-wider">{storeName.toUpperCase()}</h3>
                  <p className="text-[10px] text-stone-600 font-sans">Specialty Coffee & To-Go</p>
                  <p className="text-[9px] text-stone-600 font-sans max-w-[240px] mx-auto leading-tight mt-0.5">
                    {storeAddress || "Jl. Kebon Jeruk Raya No. 27, Kemanggisan, Palmerah, Jakarta Barat"}
                  </p>
                </div>

                <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-stone-400">
                  <div className="flex justify-between">
                    <span>Order ID:</span>
                    <span className="font-bold">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{order.cashierName || cashierName || "Alex Rivera"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold">{order.customerName}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900">
                    <span>Type:</span>
                    <span>{order.orderType === "DINE_IN" ? "DINE-IN" : "TAKEAWAY (TO-GO)"}</span>
                  </div>
                  {order.tableNumber && (
                    <div className="flex justify-between">
                      <span>{order.orderType === "DINE_IN" ? "Table #:" : "Phone:"}</span>
                      <span className="font-bold">{order.orderType === "DINE_IN" ? `#${order.tableNumber}` : order.tableNumber}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="py-1 border-b border-dashed border-stone-400 space-y-2">
                  {order.items.map((it) => (
                    <div key={it.id} className="text-[11px]">
                      <div className="flex justify-between font-semibold">
                        <span>
                          {it.quantity}x {it.productName}
                        </span>
                        <span>{formatRupiah(it.lineTotal)}</span>
                      </div>
                      {it.modifiers.length > 0 && (
                        <div className="pl-3 text-[9px] text-stone-600">
                          {it.modifiers.map((m) => (
                            <div key={m.optionCode} className="flex justify-between">
                              <span>+ {m.optionName}</span>
                              {m.priceDelta > 0 && <span>{formatRupiah(m.priceDelta)}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {it.note && (
                        <div className="pl-3 text-[9px] italic text-stone-600">
                          * Note: {it.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-stone-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(order.subtotal)}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-stone-700">
                      <span>Discount ({order.discountCode || "Promo"}):</span>
                      <span>-{formatRupiah(order.discountAmount)}</span>
                    </div>
                  )}
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>PB1 Tax:</span>
                      <span>{formatRupiah(order.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-stone-300">
                    <span>TOTAL:</span>
                    <span>{formatRupiah(order.total)}</span>
                  </div>
                </div>

                {/* Payment info */}
                <div className="text-[10px] space-y-0.5 pb-2 border-b border-dashed border-stone-400">
                  <div className="flex justify-between">
                    <span>Payment:</span>
                    <span className="font-bold">{order.payment.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tendered:</span>
                    <span>{formatRupiah(order.payment.tendered)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Change:</span>
                    <span>{formatRupiah(order.payment.change)}</span>
                  </div>
                  {order.payment.reference && (
                    <div className="flex justify-between text-[9px] text-stone-600">
                      <span>Ref / Trace:</span>
                      <span>{order.payment.reference}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="text-center text-[9px] text-stone-600 space-y-1 pt-1 font-sans">
                  <p className="font-semibold text-stone-800">Thank you for visiting {storeName}!</p>
                  <p>Instagram: @duvalcaminos.coffee</p>
                  <p className="text-[8px] text-stone-400 font-mono mt-1">Wifi: DuvalCaminos_Guest / pass: ilovecoffee</p>
                </div>
              </div>
            ) : (
              // -------------------------------------------------------------
              // BARISTA CUP TICKET
              // -------------------------------------------------------------
              <div className="space-y-3">
                <div className="text-center pb-2 border-b-2 border-stone-950">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-600">
                    BARISTA CUP TICKET
                  </p>
                  <div className="text-3xl font-black tracking-tight my-1">
                    #{order.queueNumber}
                  </div>
                  <p className="text-sm font-bold bg-stone-950 text-white py-0.5 rounded">
                    {order.customerName}
                  </p>
                  <p className="text-[10px] font-bold text-stone-600 mt-1">
                    {order.orderType === "DINE_IN" ? "DINE-IN" : "TAKEAWAY (CUP)"}
                    {order.tableNumber && ` · ${order.orderType === "DINE_IN" ? `TABLE #${order.tableNumber}` : `TEL: ${order.tableNumber}`}`}
                  </p>
                </div>

                {/* Beverage Item Details for Barista */}
                <div className="space-y-3 py-1">
                  {order.items.map((it, idx) => (
                    <div key={it.id} className="p-2 border border-stone-300 rounded bg-stone-50">
                      <div className="flex justify-between text-xs font-black">
                        <span>{it.quantity}x {it.productName}</span>
                        <span className="text-[10px] text-stone-500">#{idx + 1}</span>
                      </div>

                      <div className="mt-1 space-y-0.5 text-[10px]">
                        {it.modifiers.map((m) => (
                          <div key={m.optionCode} className="font-bold text-stone-800">
                            • {m.groupName}: <span className="text-stone-950 underline">{m.optionName}</span>
                          </div>
                        ))}
                      </div>

                      {it.note && (
                        <div className="mt-1 p-1 bg-amber-100 border border-amber-300 rounded text-[9px] font-bold text-amber-900">
                          NOTE: {it.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-center text-[9px] text-stone-500 pt-1 border-t border-dashed border-stone-300">
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#111726] px-5 py-3.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white text-xs"
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 mr-1.5 text-white" />
            Print Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
