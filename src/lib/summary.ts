export interface ShiftSummary {
  transactionCount: number;
  grossSales: number; // sum of subtotal before discount
  totalDiscount: number;
  netSales: number; // gross - discount
  totalTax: number; // PB1 10%
  totalSales: number; // grand total paid by customers
  totalCups: number; // beverage cups count
  totalItems: number;
  cashSales: number;
  qrisSales: number;
  debitSales: number;
  openingCash: number;
  cashOnHand: number; // opening + cash sales
  averageTicket: number;
  dineInCount: number;
  takeawayCount: number;
  voidCount: number;
}

export interface GenericReportOrder {
  id: string;
  orderNumber: string;
  queueNumber: number;
  orderType: string;
  customerName: string;
  tableNumber: string | null;
  status: string;
  subtotal: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  createdAt: Date | string;
  items: {
    productName: string;
    categoryName: string;
    isBeverage: boolean;
    basePrice: number;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    note?: string | null;
    modifiers: {
      groupCode: string;
      groupName: string;
      optionCode: string;
      optionName: string;
      priceDelta: number;
    }[];
  }[];
  payments: {
    method: string;
    amount: number;
    tendered: number;
    change: number;
    reference?: string | null;
  }[];
}

export function summarize(orders: any[], openingCash = 0): ShiftSummary {
  const settled = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "VOID");
  const sum = (fn: (o: any) => number) => settled.reduce((s, o) => s + fn(o), 0);
  const byMethod = (m: string) =>
    sum((o) => (o.payments || []).filter((p: any) => p.method === m).reduce((s: number, p: any) => s + p.amount, 0));

  const totalSales = sum((o) => o.total);
  const cashSales = byMethod("CASH");

  return {
    transactionCount: settled.length,
    grossSales: sum((o) => o.subtotal),
    totalDiscount: sum((o) => o.discountAmount),
    netSales: sum((o) => o.subtotal - o.discountAmount),
    totalTax: sum((o) => o.taxAmount),
    totalSales,
    totalCups: sum((o) => (o.items || []).reduce((s: number, i: any) => s + (i.isBeverage ? i.quantity : 0), 0)),
    totalItems: sum((o) => (o.items || []).reduce((s: number, i: any) => s + i.quantity, 0)),
    cashSales,
    qrisSales: byMethod("QRIS"),
    debitSales: byMethod("DEBIT_EDC"),
    openingCash,
    cashOnHand: openingCash + cashSales,
    averageTicket: settled.length ? Math.round(totalSales / settled.length) : 0,
    dineInCount: settled.filter((o) => o.orderType === "DINE_IN").length,
    takeawayCount: settled.filter((o) => o.orderType === "TAKEAWAY").length,
    voidCount: orders.length - settled.length,
  };
}
