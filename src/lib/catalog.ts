import "server-only";
import { DEFAULT_CATALOG, DEFAULT_SHIFT } from "./mock-data";
import type { CatalogDTO, ShiftDTO } from "./types";

export async function getCatalog(): Promise<CatalogDTO> {
  if (!process.env.DATABASE_URL) {
    return DEFAULT_CATALOG;
  }

  try {
    const { prisma } = await import("./prisma");
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: {
            modifierGroups: {
              orderBy: { sortOrder: "asc" },
              include: {
                group: {
                  include: {
                    options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!categories || categories.length === 0) {
      return DEFAULT_CATALOG;
    }

    return {
      categories: categories.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon })),
      products: categories.flatMap((c: any) =>
        c.products.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          description: p.description,
          basePrice: p.basePrice,
          isBeverage: p.isBeverage,
          isAvailable: p.isAvailable,
          tag: p.tag,
          categoryId: c.id,
          categoryName: c.name,
          modifierGroups: (p.modifierGroups || []).map(({ group: g }: any) => ({
            id: g.id,
            code: g.code,
            name: g.name,
            selectionType: g.selectionType,
            isRequired: g.isRequired,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            options: (g.options || []).map((o: any) => ({
              id: o.id,
              code: o.code,
              name: o.name,
              priceDelta: o.priceDelta,
              isDefault: o.isDefault,
            })),
          })),
        }))
      ),
    };
  } catch (err) {
    console.warn("Prisma unavailable, using default specialty catalog:", err);
    return DEFAULT_CATALOG;
  }
}

export async function getOpenShift(): Promise<ShiftDTO | null> {
  if (!process.env.DATABASE_URL) {
    return DEFAULT_SHIFT;
  }

  try {
    const { prisma } = await import("./prisma");
    const s = await prisma.shift.findFirst({ where: { status: "OPEN" }, orderBy: { openedAt: "desc" } });
    if (!s) return DEFAULT_SHIFT;
    return {
      id: s.id,
      cashierName: s.cashierName,
      openedAt: s.openedAt.toISOString(),
      openingCash: s.openingCash,
      status: s.status,
    };
  } catch {
    return DEFAULT_SHIFT;
  }
}
