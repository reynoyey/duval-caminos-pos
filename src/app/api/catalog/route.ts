import { NextResponse } from "next/server";
import { DEFAULT_CATALOG, DEFAULT_MODIFIER_GROUPS } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import type { ProductDTO } from "@/lib/types";
import { isPastryOrFood, sanitizeProductModifiers } from "@/lib/utils";

export const runtime = "nodejs";

// Server-side cache for instant multi-device sync
let inMemoryProducts: ProductDTO[] = [];
let inMemoryDeletedIds: string[] = [];

// Ensure default categories exist in Postgres
async function ensureCategories() {
  if (!prisma) return;
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
    if (prisma) {
      await ensureCategories();
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
          (c.products || []).map((p: any) => {
            const isPastry = isPastryOrFood({
              categoryId: c.id,
              categoryName: c.name,
              slug: c.slug,
              isBeverage: p.isBeverage,
            });
            const isBeverage = isPastry ? false : p.isBeverage;
            return {
              id: p.id,
              sku: p.sku,
              name: p.name,
              description: p.description,
              basePrice: p.basePrice,
              isBeverage,
              isAvailable: p.isAvailable,
              tag: p.tag,
              categoryId: c.id,
              categoryName: c.name,
              modifierGroups: isBeverage ? DEFAULT_MODIFIER_GROUPS : [],
              createdAt: p.createdAt?.toISOString?.() || new Date().toISOString(),
              updatedAt: p.updatedAt?.toISOString?.() || new Date().toISOString(),
            };
          })
        );

        // Merge with in-memory if in-memory has any unpersisted products
        const deletedSet = new Set(inMemoryDeletedIds);
        const productMap = new Map<string, ProductDTO>();

        for (const p of dbProducts) {
          if (!deletedSet.has(p.id)) {
            productMap.set(p.id, sanitizeProductModifiers(p));
          }
        }

        for (const p of inMemoryProducts) {
          if (!deletedSet.has(p.id)) {
            const existing = productMap.get(p.id);
            if (!existing) {
              productMap.set(p.id, sanitizeProductModifiers(p));
            } else {
              const pTime = new Date((p as any).updatedAt || p.createdAt || 0).getTime();
              const exTime = new Date((existing as any).updatedAt || existing.createdAt || 0).getTime();
              if (pTime >= exTime) {
                productMap.set(p.id, sanitizeProductModifiers(p));
              }
            }
          }
        }

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
          deletedProductIds: inMemoryDeletedIds,
        });
      }
    }
  } catch (err) {
    console.warn("[GET /api/catalog] DB read fallback to memory:", err);
  }

  // Fallback to in-memory products + default categories
  const deletedSet = new Set(inMemoryDeletedIds);
  return NextResponse.json({
    categories: DEFAULT_CATALOG.categories,
    products: inMemoryProducts.filter((p) => !deletedSet.has(p.id)).map(sanitizeProductModifiers),
    deletedProductIds: inMemoryDeletedIds,
  });
}

/** POST /api/catalog — Add, update, or sync products across devices */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Reset action
    if (body.action === "RESET") {
      const deletedIds = inMemoryProducts.map((p) => p.id);
      inMemoryDeletedIds = Array.from(new Set([...inMemoryDeletedIds, ...deletedIds])).slice(-200);
      inMemoryProducts = [];

      if (prisma) {
        await prisma.productModifierGroup.deleteMany({}).catch(() => null);
        await prisma.product.deleteMany({}).catch(() => null);
      }
      return NextResponse.json({ success: true, products: [], deletedProductIds: inMemoryDeletedIds });
    }

    let product: ProductDTO = body.product || body;
    if (!product || !product.id || !product.name) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    product = sanitizeProductModifiers(product);
    const nowIso = new Date().toISOString();
    product.updatedAt = product.updatedAt || nowIso;
    product.createdAt = product.createdAt || nowIso;

    // Remove from in-memory deleted list if re-added
    inMemoryDeletedIds = inMemoryDeletedIds.filter((id) => id !== product.id);

    // Update in-memory cache
    inMemoryProducts = [product, ...inMemoryProducts.filter((p) => p.id !== product.id)];

    // Persist to Postgres
    if (prisma) {
      await ensureCategories();

      // Check if SKU collides with another product ID
      let finalSku = product.sku;
      try {
        const existingWithSku = await prisma.product.findUnique({
          where: { sku: product.sku },
        });
        if (existingWithSku && existingWithSku.id !== product.id) {
          finalSku = `${product.sku}-${product.id.slice(-4)}`;
          product.sku = finalSku;
        }
      } catch {}

      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          sku: finalSku,
          description: product.description || null,
          basePrice: product.basePrice,
          isBeverage: product.isBeverage,
          isAvailable: product.isAvailable,
          tag: product.tag || null,
          categoryId: product.categoryId,
        },
        create: {
          id: product.id,
          sku: finalSku,
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
      return sanitizeProductModifiers({
        ...p,
        ...updates,
        isAvailable: isAvailable !== undefined ? isAvailable : p.isAvailable,
        updatedAt: new Date().toISOString(),
      });
    });

    // Update in Postgres
    if (prisma) {
      await prisma.product.update({
        where: { id },
        data: {
          ...(isAvailable !== undefined && { isAvailable }),
          ...updates,
        },
      }).catch(() => null);
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
    inMemoryDeletedIds = Array.from(new Set([...inMemoryDeletedIds, id])).slice(-200);

    if (prisma) {
      await prisma.productModifierGroup.deleteMany({ where: { productId: id } }).catch(() => null);
      await prisma.product.delete({ where: { id } }).catch(() => null);
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("[DELETE /api/catalog]", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
