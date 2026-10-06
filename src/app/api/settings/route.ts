import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DEFAULT_SERVER_SETTINGS = {
  id: "default",
  cashierName: "Alex Rivera",
  storeName: "Duval Caminos Coffee",
  storeTagline: "Specialty Coffee POS & Kitchen Display",
  storeAddress: "Jl. Kebon Jeruk Raya No. 27, Kemanggisan, Palmerah, Jakarta Barat",
  logoUrl: "/logo.jpg",
  updatedAt: new Date().toISOString(),
};

// In-memory cache for ultra-fast multi-device reads
let inMemorySettings = { ...DEFAULT_SERVER_SETTINGS };

/** GET /api/settings — Retrieve store and cashier settings */
export async function GET() {
  try {
    if (prisma) {
      const dbSettings = await prisma.storeSettings.findUnique({
        where: { id: "default" },
      });

      if (dbSettings) {
        inMemorySettings = {
          id: dbSettings.id,
          cashierName: dbSettings.cashierName,
          storeName: dbSettings.storeName,
          storeTagline: dbSettings.storeTagline,
          storeAddress: dbSettings.storeAddress,
          logoUrl: dbSettings.logoUrl,
          updatedAt: dbSettings.updatedAt.toISOString(),
        };
        return NextResponse.json({ success: true, settings: inMemorySettings });
      }
    }
  } catch (err) {
    console.warn("[GET /api/settings] DB read fallback to memory:", err);
  }

  return NextResponse.json({ success: true, settings: inMemorySettings });
}

/** POST /api/settings — Save store and cashier settings */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const cashierName = (body.cashierName || inMemorySettings.cashierName || "Alex Rivera").trim();
    const storeName = (body.storeName || inMemorySettings.storeName || "Duval Caminos Coffee").trim();
    const storeTagline = (body.storeTagline || inMemorySettings.storeTagline || "Specialty Coffee POS & Kitchen Display").trim();
    const storeAddress = (body.storeAddress || inMemorySettings.storeAddress || "").trim();
    const logoUrl = body.logoUrl || inMemorySettings.logoUrl || "/logo.jpg";
    const nowIso = new Date().toISOString();

    inMemorySettings = {
      id: "default",
      cashierName,
      storeName,
      storeTagline,
      storeAddress,
      logoUrl,
      updatedAt: nowIso,
    };

    if (prisma) {
      try {
        const saved = await prisma.storeSettings.upsert({
          where: { id: "default" },
          update: {
            cashierName,
            storeName,
            storeTagline,
            storeAddress,
            logoUrl,
          },
          create: {
            id: "default",
            cashierName,
            storeName,
            storeTagline,
            storeAddress,
            logoUrl,
          },
        });

        // Also update any open shift cashierName so receipts and shift reports align
        await prisma.shift.updateMany({
          where: { status: "OPEN" },
          data: { cashierName },
        }).catch(() => null);

        inMemorySettings.updatedAt = saved.updatedAt.toISOString();
      } catch (dbErr) {
        console.warn("[POST /api/settings] DB upsert fallback:", dbErr);
      }
    }

    return NextResponse.json({ success: true, settings: inMemorySettings });
  } catch (err: any) {
    console.error("[POST /api/settings]", err);
    return NextResponse.json({ error: err.message || "Failed to save settings" }, { status: 500 });
  }
}
