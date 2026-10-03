import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { reportOrderInclude, summarize } from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/shifts — current open shift + live summary (for close-shift screen). */
export async function GET() {
  const shift = await prisma.shift.findFirst({ where: { status: "OPEN" }, orderBy: { openedAt: "desc" } });
  if (!shift) return NextResponse.json({ shift: null, summary: null });

  const orders = await prisma.order.findMany({ where: { shiftId: shift.id }, include: reportOrderInclude });
  return NextResponse.json({
    shift: { ...shift, openedAt: shift.openedAt.toISOString() },
    summary: summarize(orders, shift.openingCash),
  });
}

const OpenShiftSchema = z.object({
  cashierName: z.string().trim().min(1, "Nama kasir wajib diisi").max(40),
  openingCash: z.number().int().min(0),
});

/** POST /api/shifts — open a new shift (only one OPEN shift allowed). */
export async function POST(req: Request) {
  const parsed = OpenShiftSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const existing = await prisma.shift.findFirst({ where: { status: "OPEN" } });
  if (existing) return NextResponse.json({ error: "Masih ada shift yang terbuka" }, { status: 409 });

  const shift = await prisma.shift.create({ data: parsed.data });
  return NextResponse.json(
    {
      id: shift.id,
      cashierName: shift.cashierName,
      openedAt: shift.openedAt.toISOString(),
      openingCash: shift.openingCash,
      status: shift.status,
    },
    { status: 201 },
  );
}
