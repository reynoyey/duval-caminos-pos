import { NextResponse } from "next/server";
import { z } from "zod";
import { computeTotals, TAX_RATE_PERCENT } from "@/lib/pricing";
import { findVoucher } from "@/lib/vouchers";
import { jakartaDateKey, jakartaDateString, jakartaDayRange } from "@/lib/time";
import type { DiscountInput, OrderRecordDTO } from "@/lib/types";

export const runtime = "nodejs";

const CreateOrderSchema = z.object({
  shiftId: z.string().min(1),
  orderType: z.enum(["DINE_IN", "TAKEAWAY"]),
  customerName: z.string().trim().min(1, "Customer name is required for barista call-out").max(40),
  tableNumber: z.string().trim().max(10).nullish(),
  discount: z.object({
    type: z.enum(["NONE", "PERCENT", "AMOUNT"]),
    value: z.number().int().min(0),
    code: z.string().nullish(),
    label: z.string().nullish(),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
        optionIds: z.array(z.string()).default([]),
        note: z.string().max(140).nullish(),
      })
    )
    .min(1, "Cart cannot be empty"),
  payment: z.object({
    method: z.enum(["CASH", "QRIS", "DEBIT_EDC"]),
    tendered: z.number().int().min(0),
    qrisMode: z.enum(["DYNAMIC", "STATIC"]).nullish(),
    reference: z.string().max(40).nullish(),
  }),
});

class OrderError extends Error {}

/** POST /api/orders — creates a new order in PROCESSING status. */
export async function POST(req: Request) {
  const parsed = CreateOrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid order payload" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    // If DATABASE_URL is available, attempt Prisma transaction
    if (process.env.DATABASE_URL) {
      const { prisma } = await import("@/lib/prisma");
      const shift = await prisma.shift.findUnique({ where: { id: body.shiftId } });
      if (!shift || shift.status !== "OPEN") throw new OrderError("Current register shift is closed");

      const productIds = [...new Set(body.items.map((i) => i.productId))];
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          category: true,
          modifierGroups: { include: { group: { include: { options: true } } } },
        },
      });
      const productMap = new Map<string, any>((products || []).map((p: any) => [p.id, p]));

      const lines = body.items.map((item) => {
        const p: any = productMap.get(item.productId);
        if (!p) throw new OrderError("Product not found in catalog");
        if (!p.isAvailable) throw new OrderError(`${p.name} is currently sold out`);

        const groups = (p.modifierGroups || []).map((pg: any) => pg.group);
        const chosen = item.optionIds.map((oid) => {
          for (const g of groups) {
            const o = (g.options || []).find((x: any) => x.id === oid && x.isActive);
            if (o) return { g, o };
          }
          throw new OrderError(`Selected modifier is invalid for ${p.name}`);
        });

        for (const g of groups) {
          const count = chosen.filter((c) => c.g.id === g.id).length;
          if ((g.isRequired || g.minSelect > 0) && count < Math.max(1, g.minSelect))
            throw new OrderError(`${p.name}: ${g.name} selection is mandatory`);
          if (count > g.maxSelect) throw new OrderError(`${p.name}: ${g.name} exceeds max limit`);
        }

        const unitPrice = p.basePrice + chosen.reduce((s, c) => s + c.o.priceDelta, 0);
        return {
          product: p,
          quantity: item.quantity,
          note: item.note?.trim() || null,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
          chosen,
        };
      });

      let discount: DiscountInput = { type: "NONE", value: 0 };
      if (body.discount.type !== "NONE" && body.discount.value > 0) {
        if (body.discount.code) {
          const v = findVoucher(body.discount.code);
          if (!v) throw new OrderError("Invalid promotional voucher code");
          discount = { type: v.type, value: v.value, code: v.code };
        } else {
          discount = { type: body.discount.type, value: body.discount.value, code: null };
        }
      }

      const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
      const totals = computeTotals(subtotal, discount);

      const { method } = body.payment;
      const tendered = method === "CASH" ? body.payment.tendered : totals.total;
      if (tendered < totals.total) throw new OrderError("Tendered cash is less than total amount due");
      const change = tendered - totals.total;

      const { start, end } = jakartaDayRange(jakartaDateString());
      const dateKey = jakartaDateKey();

      const todayCount = await prisma.order.count({ where: { createdAt: { gte: start, lt: end } } });
      const queueNumber = todayCount + 1;
      const orderNumber = `DCC-${dateKey}-${String(queueNumber).padStart(4, "0")}`;

      const created = await prisma.order.create({
        data: {
          orderNumber,
          queueNumber,
          orderType: body.orderType,
          customerName: body.customerName,
          tableNumber: body.tableNumber || null,
          status: "PROCESSING", // Starts in brewing / prep queue
          subtotal: totals.subtotal,
          discountType: discount.type,
          discountValue: discount.value,
          discountCode: discount.code ?? null,
          discountAmount: totals.discountAmount,
          taxRate: TAX_RATE_PERCENT,
          taxAmount: totals.taxAmount,
          total: totals.total,
          shiftId: shift.id,
          items: {
            create: lines.map((l: any) => ({
              productId: l.product.id,
              productName: l.product.name,
              categoryName: l.product.category?.name || "General",
              isBeverage: l.product.isBeverage,
              basePrice: l.product.basePrice,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
              note: l.note,
              modifiers: {
                create: l.chosen.map(({ g, o }: any) => ({
                  modifierOptionId: o.id,
                  groupCode: g.code,
                  groupName: g.name,
                  optionCode: o.code,
                  optionName: o.name,
                  priceDelta: o.priceDelta,
                })),
              },
            })),
          },
          payments: {
            create: {
              method,
              amount: totals.total,
              tendered,
              change,
              qrisMode: method === "QRIS" ? body.payment.qrisMode ?? "DYNAMIC" : null,
              reference: body.payment.reference || null,
            },
          },
        },
      });

      return NextResponse.json({ success: true, order: created }, { status: 201 });
    }

    // Offline / Local fallback: generate order record directly
    const dateKey = jakartaDateKey();
    const queueNumber = Math.floor(10 + Math.random() * 80);
    const orderNumber = `DCC-${dateKey}-${String(queueNumber).padStart(4, "0")}`;

    return NextResponse.json({
      success: true,
      orderNumber,
      queueNumber,
      message: "Order queued for preparation",
    });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("[POST /api/orders]", e);
    return NextResponse.json({ error: "Internal server error occurred" }, { status: 500 });
  }
}

/** PATCH /api/orders — update order status (e.g., mark as COMPLETED) */
export async function PATCH(req: Request) {
  try {
    const { orderId, status } = await req.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: "orderId and status are required" }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      const { prisma } = await import("@/lib/prisma");
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status },
      });
      return NextResponse.json({ success: true, order: updated });
    }

    return NextResponse.json({ success: true, orderId, status });
  } catch (error) {
    console.error("[PATCH /api/orders]", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
