"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_CATALOG, DEFAULT_MODIFIER_GROUPS } from "@/lib/mock-data";
import { broadcastMenuEvent, type MenuSyncEvent } from "@/lib/supabase";
import type { CatalogDTO, CategoryDTO, CreateProductPayload, ProductDTO, UpdateProductPayload } from "@/lib/types";

interface MenuState {
  categories: CategoryDTO[];
  products: ProductDTO[];
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
      products: DEFAULT_CATALOG.products,
      activeCategoryId: "ALL",
      searchQuery: "",

      setActiveCategoryId: (id) => set({ activeCategoryId: id }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      addProduct: (input, broadcast = true) => {
        const { categories, products } = get();
        const category = categories.find((c) => c.id === input.categoryId) || categories[0];
        
        // Generate SKU from Category + Name acronym
        const prefix = category.slug.slice(0, 3).toUpperCase();
        const rand = Math.floor(100 + Math.random() * 900);
        const sku = `${prefix}-${rand}`;

        // Assign modifier groups: if beverage, default to beverage modifiers
        const isBeverage = input.isBeverage ?? true;
        const modifierGroups = isBeverage
          ? DEFAULT_MODIFIER_GROUPS
          : [];

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
          createdAt: new Date().toISOString(),
        };

        const updatedProducts = [newProduct, ...products];
        set({ products: updatedProducts });

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
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
        }));

        if (broadcast) {
          broadcastMenuEvent({ type: "PRODUCT_DELETED", productId });
          fetch(`/api/catalog?id=${encodeURIComponent(productId)}`, {
            method: "DELETE",
          }).catch(() => null);
        }
      },

      toggleAvailability: (productId: string, broadcast = true) => {
        let newStatus = true;
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === productId) {
              newStatus = !p.isAvailable;
              return { ...p, isAvailable: newStatus };
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
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id !== input.id) return p;
            const updatedCategory = input.categoryId
              ? state.categories.find((c) => c.id === input.categoryId)
              : null;
            const item: ProductDTO = {
              ...p,
              name: input.name !== undefined ? input.name.trim() : p.name,
              categoryId: updatedCategory ? updatedCategory.id : p.categoryId,
              categoryName: updatedCategory ? updatedCategory.name : p.categoryName,
              basePrice: input.basePrice !== undefined ? Math.max(0, input.basePrice) : p.basePrice,
              description: input.description !== undefined ? input.description?.trim() || null : p.description,
              isBeverage: input.isBeverage !== undefined ? input.isBeverage : p.isBeverage,
              tag: input.tag !== undefined ? input.tag?.trim() || null : p.tag,
              isAvailable: input.isAvailable !== undefined ? input.isAvailable : p.isAvailable,
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
        set({
          categories: DEFAULT_CATALOG.categories,
          products: [],
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
            set((state) => {
              const exists = state.products.some((p) => p.id === event.product.id);
              if (exists) {
                return {
                  products: state.products.map((p) => (p.id === event.product.id ? event.product : p)),
                };
              }
              return { products: [event.product, ...state.products] };
            });
            break;
          }
          case "PRODUCT_UPDATED": {
            set((state) => ({
              products: state.products.map((p) => (p.id === event.product.id ? event.product : p)),
            }));
            break;
          }
          case "PRODUCT_DELETED": {
            set((state) => ({
              products: state.products.filter((p) => p.id !== event.productId),
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
              set({ products: event.products });
            }
            break;
          }
        }
      },

      hydrateCatalog: (catalog) => {
        if (catalog && catalog.products && catalog.products.length > 0) {
          const sanitizedProducts = catalog.products.map((p) =>
            p.isBeverage ? { ...p, modifierGroups: DEFAULT_MODIFIER_GROUPS } : p
          );
          set({
            categories: catalog.categories?.length > 0 ? catalog.categories : DEFAULT_CATALOG.categories,
            products: sanitizedProducts,
          });
        }
      },

      fetchLatestCatalog: async () => {
        try {
          const res = await fetch("/api/catalog", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (data && Array.isArray(data.products)) {
            set((state) => {
              // If server has products and local doesn't, or if server is newer, sync
              if (data.products.length > 0 || state.products.length === 0) {
                const sanitized = data.products.map((p: ProductDTO) =>
                  p.isBeverage ? { ...p, modifierGroups: DEFAULT_MODIFIER_GROUPS } : p
                );
                return {
                  categories: data.categories?.length > 0 ? data.categories : state.categories,
                  products: sanitized,
                };
              }
              return state;
            });
          }
        } catch (err) {
          console.warn("fetchLatestCatalog background sync error:", err);
        }
      },
    }),
    {
      name: "duval-pos-menu-v4",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        categories: s.categories,
        products: s.products,
      }),
    }
  )
);
