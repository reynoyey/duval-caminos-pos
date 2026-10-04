import { NextResponse } from "next/server";
import { z } from "zod";
import { computeTotals, TAX_RATE_PERCENT } from "@/lib/pricing";
import { findVoucher } from "@/lib/vouchers";
import { jakartaDateKey, jakartaDateString, jakartaDayRange } from "@/lib/time";
import type { DiscountInput, OrderRecordDTO } from "@/lib/types";

export const runtime = "nodejs";

// In-memory cache for instant cross-device sync across all clients (iPad, Laptop, Phone)
let inMemoryOrders: OrderRecordDTO[] = [];
let deletedOrderIds: string[] = [];
let lastResetTimestamp: number = 0;

export function getInMemoryOrders(): OrderRecordDTO[] {
  return inMemoryOrders.filter((o) => !deletedOrderIds.includes(o.id));
}

/** Helper to ensure shift exists before attaching orders */
async function ensureShiftExists(prisma: any, shiftId: string, cashierName?: string) {
  try {
    await prisma.shift.upsert({
      where: { id: shiftId || "shift-live-01" },
      update: {},
      create: {
        id: shiftId || "shift-live-01",
        cashierName: cashierName || "Alex Rivera",
        openingCash: 0,
        status: "OPEN",
      },
    });
  } catch (err) {
    console.warn("Shift upsert safe catch:", err);
  }
}

/** Helper to ensure products exist before creating order items */
async function ensureProductsExist(prisma: any, items: any[]) {
  for (const item of items) {
    if (item.productId) {
      try {
        await prisma.product.upsert({
          where: { id: item.productId },
          update: { name: item.productName },
          create: {
            id: item.productId,
            sku: "SKU-" + String(item.productId).slice(-8),
            name: item.productName || "Beverage",
            basePrice: item.basePrice || 0,
            isBeverage: item.isBeverage ?? true,
            categoryId: "cat-sig",
          },
        });
      } catch (err) {
        console.warn("Product upsert safe catch:", err);
      }
    }
  }
}

/** GET /api/orders — Returns all active/recent orders for multi-device sync */
export async function GET() {
  try {
    let dbOrdersMapped: OrderRecordDTO[] = [];

    if (process.env.DATABASE_URL) {
      try {
        const { prisma } = await import("@/lib/prisma");
        if (prisma) {
          const dbOrders = await prisma.order.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
              items: {
                include: {
                  modifiers: true,
                },
              },
              payments: true,
            },
          });

          if (dbOrders && dbOrders.length > 0) {
            dbOrdersMapped = dbOrders.map((o: any) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              queueNumber: o.queueNumber,
              orderType: o.orderType,
              customerName: o.customerName,
              tableNumber: o.tableNumber,
              status: o.status,
              subtotal: o.subtotal,
              discountType: o.discountType,
              discountValue: o.discountValue,
              discountCode: o.discountCode,
              discountAmount: o.discountAmount,
              taxRate: o.taxRate,
              taxAmount: o.taxAmount,
              total: o.total,
              shiftId: o.shiftId,
              createdAt: o.createdAt?.toISOString?.() || new Date(o.createdAt).toISOString(),
              updatedAt: o.updatedAt?.toISOString?.() || new Date(o.updatedAt).toISOString(),
              items: (o.items || []).map((i: any) => ({
                id: i.id,
                productId: i.productId,
                productName: i.productName,
                categoryName: i.categoryName,
                isBeverage: i.isBeverage,
                basePrice: i.basePrice,
                unitPrice: i.unitPrice,
                quantity: i.quantity,
                lineTotal: i.lineTotal,
                note: i.note,
                modifiers: (i.modifiers || []).map((m: any) => ({
                  groupCode: m.groupCode,
                  groupName: m.groupName,
                  optionCode: m.optionCode,
                  optionName: m.optionName,
                  priceDelta: m.priceDelta,
                })),
              })),
              payment: o.payments?.[0]
                ? {
                    id: o.payments[0].id,
                    method: o.payments[0].method,
                    amount: o.payments[0].amount,
                    tendered: o.payments[0].tendered,
                    change: o.payments[0].change,
                    qrisMode: o.payments[0].qrisMode,
                    reference: o.payments[0].reference,
                    paidAt: o.payments[0].paidAt?.toISOString?.() || new Date(o.payments[0].paidAt).toISOString(),
                  }
                : {
                    method: "CASH",
                    amount: o.total,
                    tendered: o.total,
                    change: 0,
                  },
            }));
          }
        }
      } catch (dbErr) {
        console.warn("DB orders fetch safe catch:", dbErr);
      }
    }

    // Merge DB orders and inMemoryOrders
    const orderMap = new Map<string, OrderRecordDTO>();
    for (const ord of dbOrdersMapped) {
      orderMap.set(ord.id, ord);
    }
    for (const mem of inMemoryOrders) {
      const existing = orderMap.get(mem.id);
      if (!existing || (mem.updatedAt && mem.updatedAt > (existing.updatedAt || existing.createdAt))) {
        orderMap.set(mem.id, mem);
      }
    }

    const merged = Array.from(orderMap.values())
      .filter((o) => !deletedOrderIds.includes(o.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      orders: merged,
      resetTimestamp: lastResetTimestamp,
      deletedOrderIds: deletedOrderIds.slice(-50),
    });
  } catch (error) {
    console.error("[GET /api/orders]", error);
    return NextResponse.json({
      success: true,
      orders: inMemoryOrders.filter((o) => !deletedOrderIds.includes(o.id)),
      resetTimestamp: lastResetTimestamp,
      deletedOrderIds: deletedOrderIds.slice(-50),
    });
  }
}

/** POST /api/orders — creates or syncs an order */
export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });
    }

    // Check if directly passed an OrderRecordDTO (from POS frontend checkout)
    const isDirectRecord = Boolean(rawBody.id && rawBody.orderNumber && Array.isArray(rawBody.items));

    if (isDirectRecord) {
      const orderRecord = rawBody as OrderRecordDTO;

      // Ensure not marked deleted if re-created/synced
      deletedOrderIds = deletedOrderIds.filter((id) => id !== orderRecord.id);

      // 1. Immediately store in in-memory server cache for instant multi-device sync
      inMemoryOrders = [orderRecord, ...inMemoryOrders.filter((o) => o.id !== orderRecord.id)].slice(0, 200);

      // 2. Persist to PostgreSQL via Prisma if configured
      if (process.env.DATABASE_URL) {
        try {
          const { prisma } = await import("@/lib/prisma");
          if (prisma) {
            await ensureShiftExists(prisma, orderRecord.shiftId, orderRecord.cashierName);
            await ensureProductsExist(prisma, orderRecord.items);

            await prisma.order.upsert({
              where: { id: orderRecord.id },
              update: {
                status: orderRecord.status,
                updatedAt: new Date(),
              },
              create: {
                id: orderRecord.id,
                orderNumber: orderRecord.orderNumber,
                queueNumber: orderRecord.queueNumber,
                orderType: orderRecord.orderType,
                customerName: orderRecord.customerName,
                tableNumber: orderRecord.tableNumber || null,
                status: orderRecord.status || "PROCESSING",
                subtotal: orderRecord.subtotal,
                discountType: orderRecord.discountType || "NONE",
                discountValue: orderRecord.discountValue || 0,
                discountCode: orderRecord.discountCode || null,
                discountAmount: orderRecord.discountAmount || 0,
                taxRate: orderRecord.taxRate ?? 10,
                taxAmount: orderRecord.taxAmount ?? 0,
                total: orderRecord.total,
                shiftId: orderRecord.shiftId || "shift-live-01",
                createdAt: orderRecord.createdAt ? new Date(orderRecord.createdAt) : new Date(),
                items: {
                  create: (orderRecord.items || []).map((it: any) => ({
                    productId: it.productId,
                    productName: it.productName,
                    categoryName: it.categoryName || "General",
                    isBeverage: it.isBeverage ?? true,
                    basePrice: it.basePrice || 0,
                    unitPrice: it.unitPrice || 0,
                    quantity: it.quantity || 1,
                    lineTotal: it.lineTotal || 0,
                    note: it.note || null,
                    modifiers: {
                      create: (it.modifiers || []).map((m: any) => ({
                        groupCode: m.groupCode || "MOD",
                        groupName: m.groupName || "Modifier",
                        optionCode: m.optionCode || "OPT",
                        optionName: m.optionName || "",
                        priceDelta: m.priceDelta || 0,
                      })),
                    },
                  })),
                },
                payments: orderRecord.payment
                  ? {
                      create: {
                        method: orderRecord.payment.method || "CASH",
                        amount: orderRecord.payment.amount || orderRecord.total,
                        tendered: orderRecord.payment.tendered || orderRecord.total,
                        change: orderRecord.payment.change || 0,
                        qrisMode: orderRecord.payment.qrisMode || null,
                        reference: orderRecord.payment.reference || null,
                      },
                    }
                  : undefined,
              },
            });
          }
        } catch (dbErr) {
          console.warn("DB order save safe catch:", dbErr);
        }
      }

      return NextResponse.json({ success: true, order: orderRecord }, { status: 201 });
    }

    // Otherwise, parse structured payload
    const body = rawBody;
    const dateKey = jakartaDateKey();
    const queueNumber = Math.floor(10 + Math.random() * 80);
    const orderNumber = `DCC-${dateKey}-${String(queueNumber).padStart(4, "0")}`;

    const fallbackRecord: OrderRecordDTO = {
      id: "ord-" + Date.now(),
      orderNumber,
      queueNumber,
      orderType: body.orderType || "DINE_IN",
      customerName: body.customerName || "Customer",
      tableNumber: body.tableNumber || null,
      status: "PROCESSING",
      subtotal: body.total || 0,
      discountType: "NONE",
      discountValue: 0,
      discountCode: null,
      discountAmount: 0,
      taxRate: 10,
      taxAmount: 0,
      total: body.total || 0,
      shiftId: body.shiftId || "shift-live-01",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
      payment: {
        method: body.payment?.method || "CASH",
        amount: body.total || 0,
        tendered: body.payment?.tendered || 0,
        change: 0,
      },
    };

    inMemoryOrders = [fallbackRecord, ...inMemoryOrders].slice(0, 200);

    return NextResponse.json({
      success: true,
      order: fallbackRecord,
    }, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/orders]", e);
    return NextResponse.json({ error: e.message || "Failed to process order" }, { status: 500 });
  }
}

/** PATCH /api/orders — update order status (e.g. mark as COMPLETED / READY) */
export async function PATCH(req: Request) {
  try {
    const { orderId, status, isCollected } = await req.json().catch(() => ({}));
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // 1. Update in-memory cache
    const nowIso = new Date().toISOString();
    inMemoryOrders = inMemoryOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            ...(status ? { status } : {}),
            ...(isCollected !== undefined ? { isCollected } : {}),
            updatedAt: nowIso,
          }
        : o
    );

    // 2. Update PostgreSQL via Prisma if configured
    if (process.env.DATABASE_URL) {
      try {
        const { prisma } = await import("@/lib/prisma");
        if (prisma) {
          const updateData: any = { updatedAt: new Date() };
          if (status) updateData.status = status;
          await prisma.order.update({
            where: { id: orderId },
            data: updateData,
          });
        }
      } catch (dbErr) {
        console.warn("DB order status update safe catch:", dbErr);
      }
    }

    return NextResponse.json({ success: true, orderId, status, isCollected });
  } catch (error) {
    console.error("[PATCH /api/orders]", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}

/** DELETE /api/orders — Reset orders or delete single order */
export async function DELETE(req: Request) {
  try {
    const { orderId, resetAll } = await req.json().catch(() => ({}));

    if (resetAll) {
      inMemoryOrders = [];
      lastResetTimestamp = Date.now();
      deletedOrderIds = [];
      if (process.env.DATABASE_URL) {
        try {
          const { prisma } = await import("@/lib/prisma");
          if (prisma) {
            await prisma.order.deleteMany({});
          }
        } catch (dbErr) {
          console.warn("DB clear orders safe catch:", dbErr);
        }
      }
      return NextResponse.json({
        success: true,
        message: "All orders reset",
        resetTimestamp: lastResetTimestamp,
      });
    }

    if (orderId) {
      inMemoryOrders = inMemoryOrders.filter((o) => o.id !== orderId);
      if (!deletedOrderIds.includes(orderId)) {
        deletedOrderIds.push(orderId);
      }
      if (process.env.DATABASE_URL) {
        try {
          const { prisma } = await import("@/lib/prisma");
          if (prisma) {
            await prisma.order.delete({ where: { id: orderId } });
          }
        } catch (dbErr) {
          console.warn("DB delete order safe catch:", dbErr);
        }
      }
      return NextResponse.json({ success: true, orderId });
    }

    return NextResponse.json({ error: "orderId or resetAll required" }, { status: 400 });
  } catch (error) {
    console.error("[DELETE /api/orders]", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
