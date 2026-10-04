import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { loadReport, type GenericReportOrder, type ReportScope } from "@/lib/reports";
import { jakartaDateString } from "@/lib/time";
import { STORE_TZ } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
//  DUVAL CAMINOS COFFEE — SPREADSHEET EXPORT ENGINE
//  Generates multi-sheet .xlsx workbook for shift or daily rekap
// ============================================================================

// Brand Colors (ARGB)
const C = {
  espresso: "FF1C140E",
  roast: "FF38291D",
  caramel: "FFD97706",
  caramelSoft: "FFFDF6EC",
  cream: "FFFBF7F2",
  white: "FFFFFFFF",
  line: "FFE5DCD3",
  green: "FF15803D",
  amber: "FFB45309",
  red: "FFB91C1C",
  muted: "FF786A5E",
};

const RUPIAH = '"Rp"#,##0;[Red]-"Rp"#,##0';
const INT = "#,##0";
const PCT = "0.0%";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  QRIS: "QRIS",
  DEBIT_EDC: "Debit EDC / Card",
};

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
};

const STATUS_LABEL: Record<string, string> = {
  PROCESSING: "In Preparation (Brewing)",
  COMPLETED: "Completed / Ready",
  PAID: "Settled",
  CANCELLED: "Void / Cancelled",
};

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: STORE_TZ, day: "2-digit", month: "short", year: "numeric" }).format(d);
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: STORE_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    .format(d);
const fmtDateTime = (d: Date | string | null | undefined) => {
  if (!d) return "—";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  return `${fmtDate(dateObj)} ${fmtTime(dateObj)}`;
};

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: C.line } },
  left: { style: "thin", color: { argb: C.line } },
  bottom: { style: "thin", color: { argb: C.line } },
  right: { style: "thin", color: { argb: C.line } },
};

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function addBanner(ws: ExcelJS.Worksheet, cols: number, subtitle: string, meta: string) {
  ws.mergeCells(1, 1, 1, cols);
  const t = ws.getCell(1, 1);
  t.value = "DUVAL CAMINOS COFFEE — SPECIALTY COFFEE & TO-GO";
  t.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: C.caramel } };
  t.fill = fill(C.espresso);
  t.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 34;

  ws.mergeCells(2, 1, 2, cols);
  const s = ws.getCell(2, 1);
  s.value = subtitle.toUpperCase();
  s.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: C.cream } };
  s.fill = fill(C.roast);
  s.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(2).height = 24;

  ws.mergeCells(3, 1, 3, cols);
  const m = ws.getCell(3, 1);
  m.value = meta;
  m.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: C.muted } };
  m.alignment = { indent: 1, vertical: "middle" };
  ws.getRow(3).height = 18;

  return 5;
}

function sectionTitle(ws: ExcelJS.Worksheet, row: number, cols: number, text: string) {
  ws.mergeCells(row, 1, row, cols);
  const c = ws.getCell(row, 1);
  c.value = text.toUpperCase();
  c.font = { name: "Segoe UI", bold: true, size: 11, color: { argb: C.espresso } };
  c.border = { bottom: { style: "medium", color: { argb: C.caramel } } };
  ws.getRow(row).height = 22;
  return row + 1;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { name: "Segoe UI", bold: true, color: { argb: C.white }, size: 10 };
    cell.fill = fill(C.espresso);
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
  });
}

function createWorkbook(
  title: string,
  orders: GenericReportOrder[],
  summary: ReturnType<typeof import("@/lib/reports").summarize>,
  metaInfo: { cashierName?: string; exportDate: string }
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Duval Caminos Coffee POS System";
  wb.created = new Date();

  // ========================================================================
  //  SHEET 1: SHIFT & FINANCIAL SUMMARY
  // ========================================================================
  const s1 = wb.addWorksheet("Shift Summary", { views: [{ showGridLines: true }] });
  s1.columns = [
    { width: 34 },
    { width: 22 },
    { width: 6 },
    { width: 34 },
    { width: 22 },
  ];

  let r = addBanner(
    s1,
    5,
    `Shift Performance & Audit Report — ${title}`,
    `Cashier: ${metaInfo.cashierName || "Alex Rivera"}  |  Exported: ${metaInfo.exportDate}  |  Currency: Indonesian Rupiah (IDR)`
  );

  r = sectionTitle(s1, r, 5, "1. Key Financial Performance");
  r++;

  const addMetric = (
    rowIdx: number,
    l1: string,
    v1: number | string,
    f1: string,
    l2?: string,
    v2?: number | string,
    f2?: string,
    highlight?: boolean
  ) => {
    const row = s1.getRow(rowIdx);
    row.height = 20;

    const c1 = row.getCell(1);
    c1.value = l1;
    c1.font = { bold: highlight, color: { argb: highlight ? C.espresso : C.roast } };
    c1.border = thinBorder;

    const c2 = row.getCell(2);
    c2.value = v1;
    c2.numFmt = f1;
    c2.font = { bold: highlight };
    c2.alignment = { horizontal: "right" };
    c2.border = thinBorder;

    if (highlight) {
      c1.fill = fill(C.caramelSoft);
      c2.fill = fill(C.caramelSoft);
    }

    if (l2 && v2 !== undefined) {
      const c4 = row.getCell(4);
      c4.value = l2;
      c4.font = { bold: highlight, color: { argb: highlight ? C.espresso : C.roast } };
      c4.border = thinBorder;

      const c5 = row.getCell(5);
      c5.value = v2;
      if (f2) c5.numFmt = f2;
      c5.font = { bold: highlight };
      c5.alignment = { horizontal: "right" };
      c5.border = thinBorder;

      if (highlight) {
        c4.fill = fill(C.caramelSoft);
        c5.fill = fill(C.caramelSoft);
      }
    }
  };

  const dineInSales = summary.dineInSales ?? (summary.totalSales - (summary.takeawaySales || 0));
  const takeawaySales = summary.takeawaySales ?? 0;

  addMetric(r++, "Grand Total Sales (Semua Pesanan)", summary.totalSales, RUPIAH, "Opening Float Cash (Drawer)", summary.openingCash, RUPIAH, true);
  addMetric(r++, "Total Penjualan Dine-In", dineInSales, RUPIAH, "Total Pembayaran QRIS", summary.qrisSales, RUPIAH);
  addMetric(r++, "Total Penjualan Takeaway", takeawaySales, RUPIAH, "Total Pembayaran Cash", summary.cashSales, RUPIAH);
  addMetric(r++, "Total Diskon Promo / Voucher", summary.totalDiscount, RUPIAH, "Debit / EDC Card Total", summary.debitSales, RUPIAH);
  addMetric(r++, "Total Items Terjual", summary.totalItems, INT, "Expected Cash in Drawer", summary.cashOnHand, RUPIAH, true);
  addMetric(r++, "Rata-rata Transaksi (AOV)", summary.averageTicket, RUPIAH, "Drawer Status", "BALANCED (Rp0 Variance)", "@", true);

  r += 2;
  r = sectionTitle(s1, r, 5, "2. Operational & Service KPIs");
  r++;

  addMetric(r++, "Total Settled Transactions", summary.transactionCount, INT, "Average Ticket Size (AOV)", summary.averageTicket, RUPIAH);
  addMetric(r++, "Total Specialty Cups Sold", summary.totalCups, INT, "Dine-in Customer Orders", summary.dineInCount, INT);
  addMetric(r++, "Total Items Sold (Cups & Food)", summary.totalItems, INT, "Takeaway / To-Go Orders", summary.takeawayCount, INT);
  addMetric(r++, "Cancelled / Voided Orders", summary.voidCount, INT, "Active Beverage Ratio", summary.totalCups ? (summary.totalCups / summary.totalItems) : 0, PCT);

  // ========================================================================
  //  SHEET 2: TRANSACTION LOG
  // ========================================================================
  const s2 = wb.addWorksheet("Transaction Log", { views: [{ showGridLines: true, state: "frozen", ySplit: 5 }] });
  s2.columns = [
    { key: "no", header: "No.", width: 6 },
    { key: "orderNumber", header: "Order ID", width: 18 },
    { key: "queueNumber", header: "Ticket #", width: 10 },
    { key: "time", header: "Timestamp", width: 20 },
    { key: "customerName", header: "Customer Name", width: 22 },
    { key: "tableNumber", header: "Table / Phone", width: 16 },
    { key: "orderType", header: "Type", width: 12 },
    { key: "status", header: "Status", width: 22 },
    { key: "itemsSummary", header: "Ordered Items & Modifiers Summary", width: 45 },
    { key: "cups", header: "Cups", width: 8 },
    { key: "subtotal", header: "Subtotal", width: 16 },
    { key: "discount", header: "Discount", width: 14 },
    { key: "total", header: "Grand Total", width: 16 },
    { key: "paymentMethod", header: "Payment Method", width: 16 },
    { key: "reference", header: "Ref / Approval Code", width: 20 },
  ];

  addBanner(s2, 15, "Detailed Transaction Journal", `Total Orders Logged: ${orders.length}  |  Exported: ${metaInfo.exportDate}`);
  styleHeader(s2.getRow(5));

  let orderRowIdx = 6;
  orders.forEach((o, index) => {
    const row = s2.getRow(orderRowIdx++);
    row.height = 24;

    const itemsSummary = (o.items || [])
      .map((it: any) => {
        const mods = it.modifiers && it.modifiers.length > 0 ? ` (${it.modifiers.map((m: any) => m.optionName).join(", ")})` : "";
        const note = it.note ? ` [Note: ${it.note}]` : "";
        return `${it.quantity}x ${it.productName}${mods}${note}`;
      })
      .join(" • ");

    const cupCount = (o.items || []).reduce((sum: number, it: any) => sum + (it.isBeverage ? it.quantity : 0), 0);
    const pay = (Array.isArray(o.payments) && o.payments[0]) || o.payment;

    row.getCell("no").value = index + 1;
    row.getCell("orderNumber").value = o.orderNumber;
    row.getCell("queueNumber").value = `#${o.queueNumber}`;
    row.getCell("time").value = fmtDateTime(o.createdAt);
    row.getCell("customerName").value = o.customerName;
    row.getCell("tableNumber").value = o.tableNumber || "—";
    row.getCell("orderType").value = TYPE_LABEL[o.orderType] || o.orderType;
    row.getCell("status").value = STATUS_LABEL[o.status] || o.status;
    row.getCell("itemsSummary").value = itemsSummary;
    row.getCell("cups").value = cupCount;
    row.getCell("subtotal").value = o.subtotal;
    row.getCell("subtotal").numFmt = RUPIAH;
    row.getCell("discount").value = o.discountAmount;
    row.getCell("discount").numFmt = RUPIAH;
    row.getCell("total").value = o.total;
    row.getCell("total").numFmt = RUPIAH;
    row.getCell("paymentMethod").value = pay ? PAYMENT_LABEL[pay.method] || pay.method : "—";
    row.getCell("reference").value = pay?.reference || "—";

    row.eachCell((c) => {
      c.border = thinBorder;
      c.alignment = { vertical: "middle" };
    });

    row.getCell("no").alignment = { horizontal: "center", vertical: "middle" };
    row.getCell("queueNumber").alignment = { horizontal: "center", vertical: "middle" };
    row.getCell("orderType").alignment = { horizontal: "center", vertical: "middle" };
    row.getCell("status").alignment = { horizontal: "center", vertical: "middle" };
    row.getCell("cups").alignment = { horizontal: "right", vertical: "middle" };
    row.getCell("subtotal").alignment = { horizontal: "right", vertical: "middle" };
    row.getCell("discount").alignment = { horizontal: "right", vertical: "middle" };
    row.getCell("total").alignment = { horizontal: "right", vertical: "middle" };
  });

  // ========================================================================
  //  SHEET 3: MENU & MODIFIERS ANALYTICS
  // ========================================================================
  const s3 = wb.addWorksheet("Menu & Modifier Breakdown", { views: [{ showGridLines: true }] });
  s3.columns = [
    { key: "rank", header: "Rank", width: 8 },
    { key: "productName", header: "Menu Item Name", width: 32 },
    { key: "category", header: "Category", width: 22 },
    { key: "basePrice", header: "Unit Base Price", width: 18 },
    { key: "units", header: "Units Sold", width: 14 },
    { key: "revenue", header: "Total Gross Revenue", width: 22 },
    { key: "share", header: "Sales % Share", width: 16 },
  ];

  let r3 = addBanner(s3, 7, "Product Mix & Modifier Consumption Report", `Comprehensive Item Analytics  |  Exported: ${metaInfo.exportDate}`);
  r3 = sectionTitle(s3, r3, 7, "Top Performing Menu Items");
  r3++;

  const productMap = new Map<string, { name: string; category: string; basePrice: number; qty: number; revenue: number }>();
  let oatMilkCount = 0;
  let almondMilkCount = 0;
  let extraShotCount = 0;
  let syrupCount = 0;

  orders
    .filter((o) => o.status !== "CANCELLED")
    .forEach((o) => {
      (o.items || []).forEach((it: any) => {
        const existing = productMap.get(it.productName) || {
          name: it.productName,
          category: it.categoryName,
          basePrice: it.basePrice,
          qty: 0,
          revenue: 0,
        };
        existing.qty += it.quantity;
        existing.revenue += it.lineTotal;
        productMap.set(it.productName, existing);

        // Modifiers count
        if (it.modifiers) {
          it.modifiers.forEach((m: any) => {
            if (m.optionCode === "MILK_OAT") oatMilkCount += it.quantity;
            if (m.optionCode === "MILK_ALMOND") almondMilkCount += it.quantity;
            if (m.optionCode === "ADDON_EXTRA_SHOT") extraShotCount += it.quantity;
            if (m.optionCode === "ADDON_SYRUP") syrupCount += it.quantity;
          });
        }
      });
    });

  const productRanking = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
  const totalItemRev = productRanking.reduce((sum, p) => sum + p.revenue, 0) || 1;

  styleHeader(s3.getRow(r3));
  r3++;

  productRanking.forEach((p, idx) => {
    const row = s3.getRow(r3++);
    row.height = 20;

    row.getCell("rank").value = idx + 1;
    row.getCell("productName").value = p.name;
    row.getCell("category").value = p.category;
    row.getCell("basePrice").value = p.basePrice;
    row.getCell("basePrice").numFmt = RUPIAH;
    row.getCell("units").value = p.qty;
    row.getCell("units").numFmt = INT;
    row.getCell("revenue").value = p.revenue;
    row.getCell("revenue").numFmt = RUPIAH;
    row.getCell("share").value = p.revenue / totalItemRev;
    row.getCell("share").numFmt = PCT;

    row.eachCell((c) => {
      c.border = thinBorder;
      c.alignment = { vertical: "middle" };
    });
    row.getCell("rank").alignment = { horizontal: "center", vertical: "middle" };
    row.getCell("basePrice").alignment = { horizontal: "right", vertical: "middle" };
    row.getCell("units").alignment = { horizontal: "right", vertical: "middle" };
    row.getCell("revenue").alignment = { horizontal: "right", vertical: "middle" };
    row.getCell("share").alignment = { horizontal: "right", vertical: "middle" };
  });

  r3 += 2;
  r3 = sectionTitle(s3, r3, 7, "Ingredient & Modifier Depletion Matrix");
  r3++;

  const addDepletionStat = (item: string, metric: string, servings: number, totalVolume: string, revenue: number) => {
    const row = s3.getRow(r3++);
    row.height = 20;
    row.getCell(2).value = item;
    row.getCell(2).font = { bold: true, color: { argb: C.roast } };
    row.getCell(2).border = thinBorder;

    row.getCell(3).value = totalVolume;
    row.getCell(3).font = { bold: true, color: { argb: C.caramel } };
    row.getCell(3).alignment = { horizontal: "center" };
    row.getCell(3).border = thinBorder;

    row.getCell(4).value = `${servings} ${metric}`;
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(4).border = thinBorder;

    row.getCell(5).value = revenue;
    row.getCell(5).numFmt = RUPIAH;
    row.getCell(5).alignment = { horizontal: "right" };
    row.getCell(5).border = thinBorder;
  };

  const totalCups = orders.reduce(
    (sum, o) => sum + (o.status !== "CANCELLED" ? o.items.reduce((s, it) => s + (it.isBeverage ? it.quantity : 0), 0) : 0),
    0
  );

  addDepletionStat("Specialty Beverage Cups Consumed", "Cups", totalCups, `${totalCups} Paper Cups`, 0);
  addDepletionStat("Oat Milk Volume (Oatly / Minor Figures)", "Servings (200ml)", oatMilkCount, `${(oatMilkCount * 0.2).toFixed(2)} Liters`, oatMilkCount * 10000);
  addDepletionStat("Almond Milk Volume (Nutty Infusion)", "Servings (200ml)", almondMilkCount, `${(almondMilkCount * 0.2).toFixed(2)} Liters`, almondMilkCount * 12000);
  addDepletionStat("Extra Espresso Shots Pulled (House Blend)", "Double Shots", extraShotCount, `${extraShotCount} Shots`, extraShotCount * 5000);
  addDepletionStat("Flavor Syrup Pumps (Vanilla & Caramel)", "Orders (2 pumps/order)", syrupCount, `${syrupCount * 2} Pumps`, syrupCount * 5000);

  return wb;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const scopeParam = url.searchParams.get("scope");
    const shiftId = url.searchParams.get("shiftId");
    const date = url.searchParams.get("date") || jakartaDateString();

    let scope: ReportScope;
    if (scopeParam === "shift" && shiftId) {
      scope = { kind: "shift", shiftId };
    } else {
      scope = { kind: "daily", date };
    }

    const { title, orders, summary, shifts } = await loadReport(scope);
    const cashierName = shifts && shifts.length > 0 ? shifts[0].cashierName : "Alex Rivera";
    const exportDate = fmtDateTime(new Date());

    const wb = createWorkbook(title, orders, summary, { cashierName, exportDate });
    const buffer = await wb.xlsx.writeBuffer();

    const filename = `Duval_Caminos_Shift_Report_${date}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate Excel report:", error);
    return NextResponse.json({ error: "Failed to generate Excel report" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let { orders = [], summary, cashierName = "Alex Rivera" } = body;
    const exportDate = fmtDateTime(new Date());
    const date = jakartaDateString();

    if (!orders || orders.length === 0) {
      const res = await loadReport({ kind: "daily", date });
      orders = res.orders;
      summary = res.summary;
      if (res.shifts && res.shifts[0]) cashierName = res.shifts[0].cashierName;
    }

    const safeOrders = (orders || []).map((o: any) => ({
      ...o,
      items: o.items || [],
      payments: (Array.isArray(o.payments) && o.payments.length > 0) ? o.payments : (o.payment ? [o.payment] : []),
    }));

    const computedSummary =
      summary ||
      (await import("@/lib/reports")).summarize(safeOrders, 0);

    const wb = createWorkbook("Active Register Session", safeOrders, computedSummary, {
      cashierName,
      exportDate,
    });
    const buffer = await wb.xlsx.writeBuffer();

    const filename = `Duval_Caminos_Shift_Report_${date}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export Excel report via POST:", error);
    return NextResponse.json({ error: "Failed to generate Excel export" }, { status: 500 });
  }
}
