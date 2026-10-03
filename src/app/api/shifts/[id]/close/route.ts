import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { reportOrderInclude, summarize } from "@/lib/reports";

export const runtime = "nodejs";

const CloseSchema = z.object({
  closingCashCounted: z.number().int().min(0),
  notes: z.string().max(300).nullish(),
});

/** POST /api/shifts/:id/close — blind cash count & close. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = CloseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });

  const shift = await prisma.shift.findUnique({ where: { id } });
  if (!shift) return NextResponse.json({ error: "Shift tidak ditemukan" }, { status: 404 });
  if (shift.status === "CLOSED") return NextResponse.json({ error: "Shift sudah ditutup" }, { status: 409 });

  const orders = await prisma.order.findMany({ where: { shiftId: id }, include: reportOrderInclude });
  const summary = summarize(orders, shift.openingCash);

  const closed = await prisma.shift.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      expectedCash: summary.cashOnHand,
      closingCashCounted: parsed.data.closingCashCounted,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({
    id: closed.id,
    expectedCash: summary.cashOnHand,
    closingCashCounted: parsed.data.closingCashCounted,
    variance: parsed.data.closingCashCounted - summary.cashOnHand,
  });
}
