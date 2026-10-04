import { jakartaDayRange } from "./time";
import { summarize, type GenericReportOrder, type ShiftSummary } from "./summary";
import { getInMemoryOrders } from "./orders-cache";

export * from "./summary";

export const reportOrderInclude = {
  items: { include: { modifiers: true } },
  payments: true,
};

export type ReportScope =
  | { kind: "shift"; shiftId: string }
  | { kind: "daily"; date: string /* YYYY-MM-DD */ };

export async function loadReport(scope: ReportScope) {
  if (!process.env.DATABASE_URL) {
    try {
      const live = getInMemoryOrders();
      if (live && live.length > 0) {
        const formattedOrders: GenericReportOrder[] = live.map((o) => ({
          ...o,
          payments: (Array.isArray(o.payments) && o.payments.length > 0) ? o.payments : (o.payment ? [o.payment] : []),
        }));
        return {
          title: "Active Register Shift",
          shifts: [{ cashierName: "Alex Rivera", openedAt: new Date().toISOString(), openingCash: 0, status: "OPEN" as const, id: "shift-live-01" }],
          orders: formattedOrders,
          summary: summarize(formattedOrders, 0),
        };
      }
    } catch {}

    const { INITIAL_ORDERS, DEFAULT_SHIFT } = await import("./mock-data");
    const formattedOrders: GenericReportOrder[] = INITIAL_ORDERS.map((o) => ({
      ...o,
      payments: (Array.isArray(o.payments) && o.payments.length > 0) ? o.payments : (o.payment ? [o.payment] : []),
    }));
    return {
      title: "Active Register Shift",
      shifts: [DEFAULT_SHIFT],
      orders: formattedOrders,
      summary: summarize(formattedOrders, DEFAULT_SHIFT.openingCash),
    };
  }

  try {
    const { prisma } = await import("./prisma");

    if (scope.kind === "shift") {
      const shift = await prisma.shift.findUnique({ where: { id: scope.shiftId } });
      if (!shift) throw new Error("Shift record not found");
      const orders = await prisma.order.findMany({
        where: { shiftId: shift.id },
        include: reportOrderInclude,
        orderBy: { createdAt: "asc" },
      });
      return {
        title: `Shift — ${shift.cashierName}`,
        shifts: [shift],
        orders: orders as unknown as GenericReportOrder[],
        summary: summarize(orders, shift.openingCash),
      };
    }

    const { start, end } = jakartaDayRange(scope.date);
    const [orders, shifts] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start, lt: end } },
        include: reportOrderInclude,
        orderBy: { createdAt: "asc" },
      }),
      prisma.shift.findMany({
        where: { openedAt: { gte: start, lt: end } },
        orderBy: { openedAt: "asc" },
      }),
    ]);
    const openingCash = shifts.reduce((s: number, sh: any) => s + sh.openingCash, 0);
    return {
      title: `Daily Report — ${scope.date}`,
      shifts,
      orders: orders as unknown as GenericReportOrder[],
      summary: summarize(orders, openingCash),
    };
  } catch (err) {
    console.warn("Database report load failed, checking live in-memory orders:", err);
    try {
      const live = getInMemoryOrders();
      if (live && live.length > 0) {
        const formattedOrders: GenericReportOrder[] = live.map((o) => ({
          ...o,
          payments: (Array.isArray(o.payments) && o.payments.length > 0) ? o.payments : (o.payment ? [o.payment] : []),
        }));
        return {
          title: "Active Register Shift",
          shifts: [{ cashierName: "Alex Rivera", openedAt: new Date().toISOString(), openingCash: 0, status: "OPEN" as const, id: "shift-live-01" }],
          orders: formattedOrders,
          summary: summarize(formattedOrders, 0),
        };
      }
    } catch {}

    const { INITIAL_ORDERS, DEFAULT_SHIFT } = await import("./mock-data");
    const formattedOrders: GenericReportOrder[] = INITIAL_ORDERS.map((o) => ({
      ...o,
      payments: (Array.isArray(o.payments) && o.payments.length > 0) ? o.payments : (o.payment ? [o.payment] : []),
    }));
    return {
      title: "Active Register Shift (Offline Mode)",
      shifts: [DEFAULT_SHIFT],
      orders: formattedOrders,
      summary: summarize(formattedOrders, DEFAULT_SHIFT.openingCash),
    };
  }
}
