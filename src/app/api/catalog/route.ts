import { NextResponse } from "next/server";
import { DEFAULT_CATALOG, DEFAULT_MODIFIER_GROUPS } from "@/lib/mock-data";
import type { CatalogDTO, ProductDTO } from "@/lib/types";

export const runtime = "nodejs";

// Server-side cache for instant multi-device sync
let inMemoryProducts: ProductDTO[] = [];

// Ensure default categories exist in Postgres
async function ensureCategories(prisma: any) {
  for (const cat of DEFAULT_CATALOG.categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name, slug: cat.slug, icon: cat.icon },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        isActive: true,
      },
    }).catch(() => null);
  }
}

/** GET /api/catalog — Returns latest categories and products */
export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      const { prisma } = await import("@/lib/prisma");
      if (prisma) {
        await ensureCategories(prisma);
        const categories = await prisma.category.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            products: {
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (categories && categories.length > 0) {
          const dbProducts: ProductDTO[] = categories.flatMap((c: any) =>
            (c.products || []).map((p: any) => ({
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
              modifierGroups: p.isBeverage ? DEFAULT_MODIFIER_GROUPS : [],
              createdAt: p.createdAt?.toISOString?.() || new Date().toISOString(),
            }))
          );

          // Merge with in-memory if in-memory has any unpersisted products
          const productMap = new Map<string, ProductDTO>();
          for (const p of inMemoryProducts) productMap.set(p.id, p);
          for (const p of dbProducts) productMap.set(p.id, p);

          const allProducts = Array.from(productMap.values());
          inMemoryProducts = allProducts;

          return NextResponse.json({
            categories: categories.map((c: any) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              icon: c.icon,
            })),
            products: allProducts,
          });
        }
      }
    }
  } catch (err) {
    console.warn("[GET /api/catalog] DB read fallback to memory:", err);
  }

  // Fallback to in-memory products + default categories
  return NextResponse.json({
    categories: DEFAULT_CATALOG.categories,
    products: inMemoryProducts,
  });
}

/** POST /api/catalog — Add, update, or sync products across devices */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Reset action
    if (body.action === "RESET") {
      inMemoryProducts = [];
      if (process.env.DATABASE_URL) {
        const { prisma } = await import("@/lib/prisma");
        if (prisma) {
          await prisma.product.deleteMany({}).catch(() => null);
        }
      }
      return NextResponse.json({ success: true, products: [] });
    }

    const product: ProductDTO = body.product || body;
    if (!product || !product.id || !product.name) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    // Update in-memory cache
    inMemoryProducts = [product, ...inMemoryProducts.filter((p) => p.id !== product.id)];

    // Persist to Postgres if available
    if (process.env.DATABASE_URL) {
      const { prisma } = await import("@/lib/prisma");
      if (prisma) {
        await ensureCategories(prisma);
        await prisma.product.upsert({
          where: { id: product.id },
          update: {
            name: product.name,
            sku: product.sku,
            description: product.description || null,
            basePrice: product.basePrice,
            isBeverage: product.isBeverage,
            isAvailable: product.isAvailable,
            tag: product.tag || null,
            categoryId: product.categoryId,
          },
          create: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            description: product.description || null,
            basePrice: product.basePrice,
            isBeverage: product.isBeverage,
            isAvailable: product.isAvailable,
            tag: product.tag || null,
            categoryId: product.categoryId,
          },
        }).catch((e: any) => {
          console.warn("[POST /api/catalog] DB upsert product error:", e);
        });
      }
    }

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("[POST /api/catalog]", error);
    return NextResponse.json({ error: "Failed to save product" }, { status: 500 });
  }
}

/** PATCH /api/catalog — Toggle product availability or edit */
export async function PATCH(req: Request) {
  try {
    const { id, isAvailable, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    // Update in-memory cache
    inMemoryProducts = inMemoryProducts.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        ...updates,
        isAvailable: isAvailable !== undefined ? isAvailable : p.isAvailable,
      };
    });

    // Update in Postgres
    if (process.env.DATABASE_URL) {
      const { prisma } = await import("@/lib/prisma");
      if (prisma) {
        await prisma.product.update({
          where: { id },
          data: {
            ...(isAvailable !== undefined && { isAvailable }),
            ...updates,
          },
        }).catch(() => null);
      }
    }

    return NextResponse.json({ success: true, id, isAvailable });
  } catch (error) {
    console.error("[PATCH /api/catalog]", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

/** DELETE /api/catalog — Delete a product */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    inMemoryProducts = inMemoryProducts.filter((p) => p.id !== id);

    if (process.env.DATABASE_URL) {
      const { prisma } = await import("@/lib/prisma");
      if (prisma) {
        await prisma.product.delete({ where: { id } }).catch(() => null);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("[DELETE /api/catalog]", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
