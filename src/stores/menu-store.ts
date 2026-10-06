"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_CATALOG, DEFAULT_MODIFIER_GROUPS } from "@/lib/mock-data";
import { broadcastMenuEvent, type MenuSyncEvent } from "@/lib/supabase";
import type { CatalogDTO, CategoryDTO, CreateProductPayload, ProductDTO, UpdateProductPayload } from "@/lib/types";
import { isPastryOrFood, sanitizeProductModifiers } from "@/lib/utils";

interface MenuState {
  categories: CategoryDTO[];
  products: ProductDTO[];
  deletedProductIds: string[];
  activeCategoryId: string; // for tab filtering
  searchQuery: string;

  setActiveCategoryId: (id: string) => void;
  setSearchQuery: (q: string) => void;

  addProduct: (input: CreateProductPayload, broadcast?: boolean) => ProductDTO;
  deleteProduct: (productId: string, broadcast?: boolean) => void;
  toggleAvailability: (productId: string, broadcast?: boolean) => void;
  updateProduct: (input: UpdateProductPayload, broadcast?: boolean) => void;
  resetToDefaultMenu: (broadcast?: boolean) => void;
  hydrateCatalog: (catalog: CatalogDTO) => void;
  applyRemoteMenuEvent: (event: MenuSyncEvent) => void;
  fetchLatestCatalog: () => Promise<void>;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "prod-" + Math.random().toString(36).slice(2, 9);

export const useMenuStore = create<MenuState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATALOG.categories,
      products: DEFAULT_CATALOG.products.map(sanitizeProductModifiers),
      deletedProductIds: [],
      activeCategoryId: "ALL",
      searchQuery: "",

      setActiveCategoryId: (id) => set({ activeCategoryId: id }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      addProduct: (input, broadcast = true) => {
        const { categories, products, deletedProductIds } = get();
        const category = categories.find((c) => c.id === input.categoryId) || categories[0];

        // Generate robust, unique SKU from Category + Name + Timestamp to avoid unique constraint crashes
        const prefix = category.slug.slice(0, 3).toUpperCase();
        const rand = Math.floor(100 + Math.random() * 900);
        const timePart = Date.now().toString().slice(-4);
        const sku = `${prefix}-${timePart}${rand.toString().slice(-2)}`;

        // Pastry & Food NEVER have drink modifiers (ice, sugar/sweetness, cup size, milk)
        const isPastry = isPastryOrFood({
          categoryId: category.id,
          categoryName: category.name,
          slug: category.slug,
          isBeverage: input.isBeverage,
        });

        const isBeverage = isPastry ? false : (input.isBeverage ?? true);
        const modifierGroups = isBeverage ? DEFAULT_MODIFIER_GROUPS : [];
        const nowIso = new Date().toISOString();

        const newProduct: ProductDTO = {
          id: uid(),
          sku,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          basePrice: Math.max(0, Math.round(input.basePrice)),
          isBeverage,
          isAvailable: input.isAvailable ?? true,
          tag: input.tag?.trim() || null,
          categoryId: category.id,
          categoryName: category.name,
          modifierGroups,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        const updatedProducts = [newProduct, ...products.filter((p) => p.id !== newProduct.id)];
        const cleanDeleted = deletedProductIds.filter((id) => id !== newProduct.id);

        set({
          products: updatedProducts,
          deletedProductIds: cleanDeleted,
        });

        if (broadcast) {
          // 1. Instant Realtime broadcast to all other open devices
          broadcastMenuEvent({ type: "PRODUCT_ADDED", product: newProduct });

          // 2. Cloud Serverless persistence
          fetch("/api/catalog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product: newProduct }),
          }).catch((err) => console.warn("Cloud save catalog failed:", err));
        }

        return newProduct;
      },

      deleteProduct: (productId: string, broadcast = true) => {
        const { products, deletedProductIds } = get();
        const updatedProducts = products.filter((p) => p.id !== productId);
        const updatedDeleted = Array.from(new Set([...deletedProductIds, productId])).slice(-100);

        set({
          products: updatedProducts,
          deletedProductIds: updatedDeleted,
        });

        if (broadcast) {
          broadcastMenuEvent({ type: "PRODUCT_DELETED", productId });
          fetch(`/api/catalog?id=${encodeURIComponent(productId)}`, {
            method: "DELETE",
          }).catch(() => null);
        }
      },

      toggleAvailability: (productId: string, broadcast = true) => {
        let newStatus = true;
        const nowIso = new Date().toISOString();
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === productId) {
              newStatus = !p.isAvailable;
              return { ...p, isAvailable: newStatus, updatedAt: nowIso };
            }
            return p;
          }),
        }));

        if (broadcast) {
          broadcastMenuEvent({
            type: "PRODUCT_AVAILABILITY_TOGGLED",
            productId,
            isAvailable: newStatus,
          });
          fetch("/api/catalog", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: productId, isAvailable: newStatus }),
          }).catch(() => null);
        }
      },

      updateProduct: (input, broadcast = true) => {
        let updatedProd: ProductDTO | null = null;
        const nowIso = new Date().toISOString();

        set((state) => ({
          products: state.products.map((p) => {
            if (p.id !== input.id) return p;
            const updatedCategory = input.categoryId
              ? state.categories.find((c) => c.id === input.categoryId)
              : state.categories.find((c) => c.id === p.categoryId);

            const isPastry = isPastryOrFood({
              categoryId: updatedCategory?.id ?? p.categoryId,
              categoryName: updatedCategory?.name ?? p.categoryName,
              slug: updatedCategory?.slug,
              isBeverage: input.isBeverage !== undefined ? input.isBeverage : p.isBeverage,
            });

            const isBeverage = isPastry ? false : (input.isBeverage !== undefined ? input.isBeverage : p.isBeverage);
            const modifierGroups = isBeverage
              ? (p.modifierGroups && p.modifierGroups.length > 0 ? p.modifierGroups : DEFAULT_MODIFIER_GROUPS)
              : [];

            const item: ProductDTO = {
              ...p,
              name: input.name !== undefined ? input.name.trim() : p.name,
              categoryId: updatedCategory ? updatedCategory.id : p.categoryId,
              categoryName: updatedCategory ? updatedCategory.name : p.categoryName,
              basePrice: input.basePrice !== undefined ? Math.max(0, input.basePrice) : p.basePrice,
              description: input.description !== undefined ? input.description?.trim() || null : p.description,
              isBeverage,
              tag: input.tag !== undefined ? input.tag?.trim() || null : p.tag,
              isAvailable: input.isAvailable !== undefined ? input.isAvailable : p.isAvailable,
              modifierGroups,
              updatedAt: nowIso,
            };
            updatedProd = item;
            return item;
          }),
        }));

        if (broadcast && updatedProd) {
          broadcastMenuEvent({ type: "PRODUCT_UPDATED", product: updatedProd });
          fetch("/api/catalog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product: updatedProd }),
          }).catch(() => null);
        }
      },

      resetToDefaultMenu: (broadcast = true) => {
        const { products } = get();
        const allIds = products.map((p) => p.id);

        set({
          categories: DEFAULT_CATALOG.categories,
          products: [],
          deletedProductIds: allIds,
        });

        if (broadcast) {
          broadcastMenuEvent({ type: "CATALOG_RESET" });
          fetch("/api/catalog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "RESET" }),
          }).catch(() => null);
        }
      },

      applyRemoteMenuEvent: (event: MenuSyncEvent) => {
        switch (event.type) {
          case "PRODUCT_ADDED": {
            const cleanProduct = sanitizeProductModifiers(event.product);
            set((state) => {
              const deletedSet = new Set(state.deletedProductIds || []);
              deletedSet.delete(cleanProduct.id);
              const exists = state.products.some((p) => p.id === cleanProduct.id);
              if (exists) {
                return {
                  products: state.products.map((p) => (p.id === cleanProduct.id ? cleanProduct : p)),
                  deletedProductIds: Array.from(deletedSet),
                };
              }
              return {
                products: [cleanProduct, ...state.products],
                deletedProductIds: Array.from(deletedSet),
              };
            });
            break;
          }
          case "PRODUCT_UPDATED": {
            const cleanProduct = sanitizeProductModifiers(event.product);
            set((state) => ({
              products: state.products.map((p) => (p.id === cleanProduct.id ? cleanProduct : p)),
            }));
            break;
          }
          case "PRODUCT_DELETED": {
            set((state) => ({
              products: state.products.filter((p) => p.id !== event.productId),
              deletedProductIds: Array.from(new Set([...(state.deletedProductIds || []), event.productId])).slice(-100),
            }));
            break;
          }
          case "PRODUCT_AVAILABILITY_TOGGLED": {
            set((state) => ({
              products: state.products.map((p) =>
                p.id === event.productId ? { ...p, isAvailable: event.isAvailable } : p
              ),
            }));
            break;
          }
          case "CATALOG_RESET": {
            set({ products: [] });
            break;
          }
          case "CATALOG_SYNC": {
            if (event.products) {
              set({ products: event.products.map(sanitizeProductModifiers) });
            }
            break;
          }
        }
      },

      hydrateCatalog: (catalog) => {
        if (catalog && catalog.products && catalog.products.length > 0) {
          const sanitizedProducts = catalog.products.map(sanitizeProductModifiers);
          set((state) => {
            const deletedSet = new Set(state.deletedProductIds || []);
            const currentMap = new Map<string, ProductDTO>();
            for (const p of state.products) {
              if (!deletedSet.has(p.id)) currentMap.set(p.id, p);
            }
            for (const sp of sanitizedProducts) {
              if (!deletedSet.has(sp.id) && !currentMap.has(sp.id)) {
                currentMap.set(sp.id, sp);
              }
            }
            return {
              categories: catalog.categories?.length > 0 ? catalog.categories : state.categories,
              products: Array.from(currentMap.values()),
            };
          });
        }
      },

      fetchLatestCatalog: async () => {
        try {
          const res = await fetch("/api/catalog", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (data && Array.isArray(data.products)) {
            const serverProducts: ProductDTO[] = data.products.map(sanitizeProductModifiers);
            const serverDeleted: string[] = Array.isArray(data.deletedProductIds) ? data.deletedProductIds : [];

            set((state) => {
              const deletedSet = new Set([...(state.deletedProductIds || []), ...serverDeleted]);

              // Start with local products that are not marked deleted
              const productMap = new Map<string, ProductDTO>();
              for (const p of state.products) {
                if (!deletedSet.has(p.id)) {
                  productMap.set(p.id, p);
                }
              }

              // Merge server products
              for (const sp of serverProducts) {
                if (deletedSet.has(sp.id)) continue;
                const existing = productMap.get(sp.id);
                if (!existing) {
                  productMap.set(sp.id, sp);
                } else {
                  // Keep latest by updatedAt or createdAt
                  const serverTime = new Date((sp as any).updatedAt || sp.createdAt || 0).getTime();
                  const localTime = new Date((existing as any).updatedAt || existing.createdAt || 0).getTime();
                  if (serverTime >= localTime) {
                    productMap.set(sp.id, sp);
                  }
                }
              }

              const mergedProducts = Array.from(productMap.values());

              // Auto-sync unpersisted local products to server in background so they never get lost
              for (const p of state.products) {
                if (!serverProducts.some((sp) => sp.id === p.id) && !deletedSet.has(p.id)) {
                  fetch("/api/catalog", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ product: p }),
                  }).catch(() => null);
                }
              }

              return {
                categories: data.categories?.length > 0 ? data.categories : state.categories,
                products: mergedProducts,
                deletedProductIds: Array.from(deletedSet).slice(-100),
              };
            });
          }
        } catch (err) {
          console.warn("fetchLatestCatalog background sync error:", err);
        }
      },
    }),
    {
      name: "duval-pos-menu-v5",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        categories: s.categories,
        products: s.products.map(sanitizeProductModifiers),
        deletedProductIds: s.deletedProductIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.products)) {
          state.products = state.products.map(sanitizeProductModifiers);
        }
      },
    }
  )
);
