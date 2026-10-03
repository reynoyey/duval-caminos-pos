"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Search, X, Plus, Sparkles, AlertCircle, PlusCircle } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
import type { CatalogDTO, ProductDTO } from "@/lib/types";
import { useCartStore } from "@/stores/cart-store";
import { useMenuStore } from "@/stores/menu-store";
import { CATEGORY_ICONS, CATEGORY_THEME, DEFAULT_THEME } from "./category-theme";

interface Props {
  catalog: CatalogDTO;
  onPick: (product: ProductDTO) => void;
  onOpenAddModal?: () => void;
  onOpenMenuManager?: () => void;
}

export function MenuCatalog({ catalog, onPick, onOpenAddModal, onOpenMenuManager }: Props) {
  const storeCategories = useMenuStore((s) => s.categories);
  const storeProducts = useMenuStore((s) => s.products);

  const categories = storeCategories.length > 0 ? storeCategories : catalog.categories;
  const products = storeProducts.length > 0 ? storeProducts : catalog.products;

  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const lines = useCartStore((s) => s.lines);

  const slugById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.slug])),
    [categories]
  );

  const qtyByProduct = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of lines) m[l.productId] = (m[l.productId] ?? 0) + l.quantity;
    return m;
  }, [lines]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q) return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return activeCat === "all" || p.categoryId === activeCat;
    });
  }, [products, activeCat, query]);

  // "/" focuses search bar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tabs = [{ id: "all", name: "All Items", icon: "LayoutGrid", slug: "all" }, ...categories];

  return (
    <section aria-label="Menu Catalog" className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Category Tabs & Instant Search */}
      <div className="flex items-center gap-2.5">
        <nav className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto pb-1" role="tablist">
          {tabs.map((c) => {
            const Icon = CATEGORY_ICONS[c.icon ?? "Coffee"] ?? CATEGORY_ICONS.Coffee;
            const active = activeCat === c.id && !query;
            const count = c.id === "all" ? products.length : products.filter((p) => p.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                id={`cat-tab-${c.slug}`}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveCat(c.id);
                  setQuery("");
                }}
                className={cn(
                  "group flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all duration-150 select-none shadow-sm",
                  active
                    ? "border-white/15 bg-[#1E293B] text-white shadow-sm"
                    : "border-white/10 bg-[#111726] text-slate-400 hover:border-white/20 hover:text-white hover:bg-[#161F30]"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", active ? "text-rose-400" : "text-slate-400")} />
                <span>{c.name}</span>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.2 text-[10px] tabular-nums font-bold",
                    active ? "bg-white/15 text-white" : "bg-white/5 text-slate-400"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Quick Search & Menu Manager Shortcut */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-48 sm:w-56 lg:w-60">
            <Search className="pointer-events-none absolute top-1/2 left-3 w-3.5 h-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu... (/)"
              className="h-10 w-full rounded-xl border border-white/10 bg-[#111726] pr-8 pl-8 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-sm"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {onOpenMenuManager && (
            <button
              type="button"
              onClick={onOpenMenuManager}
              className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-white/10 bg-[#111726] hover:bg-[#182032] text-slate-300 hover:text-white font-medium text-xs shadow-sm shrink-0 transition-all"
              title="Kelola, tambah, atau hapus menu"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Add/Hapus Menu</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div
        id="product-grid"
        tabIndex={0}
        className="no-scrollbar grid flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 content-start focus:outline-none"
      >
        {filtered.map((product) => {
          const inCart = qtyByProduct[product.id] ?? 0;
          const slug = slugById[product.categoryId] ?? "espresso";
          const theme = CATEGORY_THEME[slug] ?? DEFAULT_THEME;
          const hasModifiers = product.modifierGroups && product.modifierGroups.length > 0;

          return (
            <button
              key={product.id}
              id={`product-card-${product.sku.toLowerCase()}`}
              disabled={!product.isAvailable}
              onClick={() => onPick(product)}
              className={cn(
                "group relative flex min-h-[150px] flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-150 select-none shadow-sm",
                "bg-[#121826] hover:bg-[#161F30] border-white/10 hover:border-white/20",
                product.isAvailable
                  ? "active:scale-[0.99]"
                  : "cursor-not-allowed opacity-40 border-stone-800/40 grayscale"
              )}
            >
              {/* Top Row: Tag / Category & In-Cart Badge */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex flex-wrap gap-1">
                  {product.tag ? (
                    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border", theme.badge)}>
                      <Sparkles className="w-2.5 h-2.5" />
                      {product.tag}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      {product.categoryName}
                    </span>
                  )}
                </div>

                {inCart > 0 && (
                  <span className="flex h-5 items-center rounded-full bg-rose-600 px-2 text-[10px] font-bold text-white shadow-sm">
                    {inCart}x
                  </span>
                )}
              </div>

              {/* Middle: Title & Description */}
              <div className="my-1.5">
                <h3 className="line-clamp-2 text-sm font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400 leading-tight">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Bottom: Price & Quick Action Indicator */}
              <div className="flex items-end justify-between pt-2 border-t border-white/10">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">Base</span>
                  <span className="text-sm font-bold text-cyan-400 font-mono tabular-nums">
                    {formatRupiah(product.basePrice)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {hasModifiers && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-medium">
                      Custom
                    </span>
                  )}
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white group-hover:bg-rose-600 transition-colors">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Sold Out Overlay */}
              {!product.isAvailable && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/85 backdrop-blur-[2px] p-2 text-center">
                  <AlertCircle className="w-5 h-5 text-red-400 mb-1" />
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                    Sold Out
                  </span>
                  <span className="text-[10px] text-stone-400">Out of Stock</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
