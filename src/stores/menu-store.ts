"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_CATALOG, DEFAULT_MODIFIER_GROUPS } from "@/lib/mock-data";
import type { CatalogDTO, CategoryDTO, CreateProductPayload, ProductDTO, UpdateProductPayload } from "@/lib/types";

interface MenuState {
  categories: CategoryDTO[];
  products: ProductDTO[];
  activeCategoryId: string; // for tab filtering
  searchQuery: string;

  setActiveCategoryId: (id: string) => void;
  setSearchQuery: (q: string) => void;

  addProduct: (input: CreateProductPayload) => ProductDTO;
  deleteProduct: (productId: string) => void;
  toggleAvailability: (productId: string) => void;
  updateProduct: (input: UpdateProductPayload) => void;
  resetToDefaultMenu: () => void;
  hydrateCatalog: (catalog: CatalogDTO) => void;
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

      addProduct: (input) => {
        const { categories, products } = get();
        const category = categories.find((c) => c.id === input.categoryId) || categories[0];
        
        // Generate SKU from Category + Name acronym
        const prefix = category.slug.slice(0, 3).toUpperCase();
        const rand = Math.floor(100 + Math.random() * 900);
        const sku = `${prefix}-${rand}`;

        // Assign modifier groups: if beverage, default to all/beverage modifiers
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

        set({ products: [newProduct, ...products] });
        return newProduct;
      },

      deleteProduct: (productId: string) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== productId),
        }));
      },

      toggleAvailability: (productId: string) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p
          ),
        }));
      },

      updateProduct: (input) => {
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id !== input.id) return p;
            const updatedCategory = input.categoryId
              ? state.categories.find((c) => c.id === input.categoryId)
              : null;
            return {
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
          }),
        }));
      },

      resetToDefaultMenu: () => {
        set({
          categories: DEFAULT_CATALOG.categories,
          products: DEFAULT_CATALOG.products,
        });
      },

      hydrateCatalog: (catalog) => {
        // If state already has custom products, preserve them or merge
        if (catalog && catalog.products && catalog.products.length > 0) {
          set({
            categories: catalog.categories,
            products: catalog.products,
          });
        }
      },
    }),
    {
      name: "duval-pos-menu-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        categories: s.categories,
        products: s.products,
      }),
    }
  )
);
