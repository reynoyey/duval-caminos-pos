"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  XCircle,
  Coffee,
  Sparkles,
  RotateCcw,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatRupiah, isPastryOrFood } from "@/lib/utils";
import { useMenuStore } from "@/stores/menu-store";
import type { CreateProductPayload, ProductDTO } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";

export function MenuManager() {
  const categories = useMenuStore((s) => s.categories);
  const products = useMenuStore((s) => s.products);
  const addProduct = useMenuStore((s) => s.addProduct);
  const updateProduct = useMenuStore((s) => s.updateProduct);
  const deleteProduct = useMenuStore((s) => s.deleteProduct);
  const toggleAvailability = useMenuStore((s) => s.toggleAvailability);
  const resetToDefaultMenu = useMenuStore((s) => s.resetToDefaultMenu);

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDTO | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "cat-sig");
  const [basePrice, setBasePrice] = useState("");
  const [description, setDescription] = useState("");
  const [isBeverage, setIsBeverage] = useState(true);
  const [tag, setTag] = useState("");

  const filtered = products.filter((p) => {
    if (activeCategory !== "ALL" && p.categoryId !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  const handleStartAdd = () => {
    setEditingProduct(null);
    setName("");
    const initialCat = activeCategory !== "ALL"
      ? (categories.find((c) => c.id === activeCategory)?.id || categories[0]?.id || "cat-sig")
      : (categories[0]?.id || "cat-sig");
    const selectedCat = categories.find((c) => c.id === initialCat);
    const isPastry = isPastryOrFood(selectedCat);

    setCategoryId(initialCat);
    setBasePrice("");
    setDescription("");
    setIsBeverage(!isPastry);
    setTag("");
    setIsAddModalOpen(true);
  };

  const handleStartEdit = (prod: ProductDTO) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategoryId(prod.categoryId);
    setBasePrice(String(prod.basePrice));
    setDescription(prod.description || "");
    const isPastry = isPastryOrFood(prod);
    setIsBeverage(!isPastry && prod.isBeverage);
    setTag(prod.tag || "");
    setIsAddModalOpen(true);
  };

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const selectedCat = categories.find((c) => c.id === newCatId);
    if (isPastryOrFood(selectedCat)) {
      setIsBeverage(false);
    } else {
      setIsBeverage(true);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama produk tidak boleh kosong");
      return;
    }
    const priceNum = Number(basePrice.replace(/\D/g, ""));
    if (!priceNum || priceNum <= 0) {
      toast.error("Masukkan harga dasar yang valid");
      return;
    }

    const selectedCat = categories.find((c) => c.id === categoryId);
    const isPastry = isPastryOrFood(selectedCat) || !isBeverage;
    const finalIsBeverage = !isPastry;

    if (editingProduct) {
      updateProduct({
        id: editingProduct.id,
        name: name.trim(),
        categoryId,
        basePrice: priceNum,
        description: description.trim() || undefined,
        isBeverage: finalIsBeverage,
        tag: tag.trim() || undefined,
      });
      toast.success(`Berhasil memperbarui menu "${name.trim()}"!`);
    } else {
      const payload: CreateProductPayload = {
        name: name.trim(),
        categoryId,
        basePrice: priceNum,
        description: description.trim() || undefined,
        isBeverage: finalIsBeverage,
        tag: tag.trim() || undefined,
        isAvailable: true,
      };

      const newProd = addProduct(payload);
      toast.success(`Berhasil menambahkan "${newProd.name}" (${newProd.sku})!`);
    }

    // Reset form
    setName("");
    setBasePrice("");
    setDescription("");
    setTag("");
    setEditingProduct(null);
    setIsAddModalOpen(false);
  };

  const handleDelete = (prod: ProductDTO) => {
    if (confirm(`Apakah Anda yakin ingin menghapus "${prod.name}" (${prod.sku}) dari menu kasir?`)) {
      deleteProduct(prod.id);
      toast.error(`Menu "${prod.name}" telah dihapus`);
    }
  };

  const handleReset = () => {
    if (confirm("Kosongkan semua item dalam katalog menu Duval Caminos?")) {
      resetToDefaultMenu();
      toast.info("Katalog menu telah dikosongkan");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0E17] p-4 lg:p-6 overflow-hidden select-none">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>Menu Catalog Management</span>
            </h2>
            <span className="rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
              {products.length} Products
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tambah, edit, atau hapus minuman specialty & pastry, kelola status ketersediaan (In Stock / Sold Out).
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="border-white/10 bg-[#111726] hover:bg-[#182032] text-slate-300 hover:text-white text-xs h-9 transition-all"
            title="Kosongkan semua menu"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Kosongkan Menu
          </Button>

          <Button
            type="button"
            onClick={handleStartAdd}
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            + Add New Menu Item
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0",
              activeCategory === "ALL"
                ? "bg-[#1E293B] text-white border border-white/15 shadow-sm"
                : "border border-white/10 bg-[#111726] text-slate-400 hover:text-white hover:bg-[#161F30]"
            )}
          >
            All Items ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            const active = activeCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5",
                  active
                    ? "bg-[#1E293B] text-white border border-white/15 shadow-sm"
                    : "border border-white/10 bg-[#111726] text-slate-400 hover:text-white hover:bg-[#161F30]"
                )}
              >
                <span>{c.name}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded font-medium",
                  active ? "bg-white/15 text-white" : "bg-white/5 text-slate-400"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 w-3.5 h-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name or SKU..."
            className="h-9 w-full rounded-xl border border-white/10 bg-[#111726] pr-3 pl-8 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="flex-1 overflow-y-auto no-scrollbar rounded-2xl border border-white/10 bg-[#111726] shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#0D121D] text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-white/10 z-10">
            <tr>
              <th className="py-2.5 px-4">Item & SKU</th>
              <th className="py-2.5 px-4">Category</th>
              <th className="py-2.5 px-4 text-right">Base Price</th>
              <th className="py-2.5 px-4 text-center">Classification</th>
              <th className="py-2.5 px-4 text-center">Availability</th>
              <th className="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-medium text-slate-300">
            {filtered.map((prod) => (
              <tr
                key={prod.id}
                className={cn(
                  "hover:bg-white/[0.02] transition-colors",
                  !prod.isAvailable && "opacity-60 bg-black/20"
                )}
              >
                {/* Item & SKU */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400 shrink-0">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{prod.name}</span>
                        {prod.tag && (
                          <span className="rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 text-[9px] font-bold text-rose-300 uppercase">
                            {prod.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="font-mono text-cyan-400">{prod.sku}</span>
                        {prod.description && <span className="truncate max-w-xs text-slate-500">{prod.description}</span>}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="py-3 px-4 text-slate-300 text-xs">{prod.categoryName}</td>

                {/* Base Price */}
                <td className="py-3 px-4 text-right font-mono font-bold text-white text-xs">
                  {formatRupiah(prod.basePrice)}
                </td>

                {/* Type */}
                <td className="py-3 px-4 text-center">
                  {(() => {
                    const isPastry = isPastryOrFood(prod);
                    return (
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase border",
                          !isPastry && prod.isBeverage
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        )}
                      >
                        {!isPastry && prod.isBeverage ? "Beverage (Custom)" : "Pastry / Food (No Custom)"}
                      </span>
                    );
                  })()}
                </td>

                {/* Stock Toggle */}
                <td className="py-3 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => toggleAvailability(prod.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all border",
                      prod.isAvailable
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/20"
                    )}
                  >
                    {prod.isAvailable ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>In Stock</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span>Sold Out</span>
                      </>
                    )}
                  </button>
                </td>

                {/* Actions (Edit & Delete buttons) */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(prod)}
                      className="text-slate-300 hover:text-white hover:bg-white/10 h-7 px-2 text-xs font-medium transition-all"
                      title="Edit item menu ini"
                    >
                      <Edit3 className="w-3 h-3 mr-1 text-slate-400" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(prod)}
                      className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 h-7 px-2 text-xs font-medium transition-all"
                      title="Hapus item menu permanen"
                    >
                      <Trash2 className="w-3 h-3 mr-1 text-slate-400" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                  {products.length === 0
                    ? "Katalog menu saat ini masih kosong. Klik tombol \"+ Add New Menu Item\" di atas untuk menambahkan menu baru Anda."
                    : "Tidak ada item menu ditemukan untuk filter atau pencarian ini."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#111726] border border-white/10 text-white p-0 overflow-hidden shadow-2xl">
          <form onSubmit={handleSaveProduct}>
            {/* Header */}
            <div className="bg-[#0D121D] px-6 py-4 border-b border-white/10">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>{editingProduct ? "Edit Menu Item" : "Add New Menu Item"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                {editingProduct
                  ? `Perbarui detail "${editingProduct.name}" (${editingProduct.sku}) di katalog register kasir.`
                  : "Buat minuman specialty atau pastry baru langsung ke register kasir POS Duval Caminos."}
              </DialogDescription>
            </div>

            {/* Form Fields */}
            <div className="p-6 space-y-4">
              {/* Product Name */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-name" className="text-xs text-slate-300 font-semibold">
                  Product Name <span className="text-rose-400">*</span>
                </Label>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spanish Cortado, Pistachio Latte..."
                  required
                  className="h-9 text-xs bg-[#0D121D] border border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500/50"
                />
              </div>

              {/* Category & Price Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-cat" className="text-xs text-slate-300 font-semibold">
                    Category
                  </Label>
                  <select
                    id="prod-cat"
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="h-9 w-full rounded-md border border-white/10 bg-[#0D121D] px-3 text-xs text-white outline-none focus:border-cyan-500/50"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#111726] text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-price" className="text-xs text-slate-300 font-semibold">
                    Base Price (IDR) <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    id="prod-price"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="e.g. 32000"
                    required
                    className="h-9 text-xs font-mono font-bold bg-[#0D121D] border border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-desc" className="text-xs text-slate-300 font-semibold">
                  Flavor Description (Optional)
                </Label>
                <Textarea
                  id="prod-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Double shot espresso with steamed milk and velvety foam..."
                  rows={2}
                  className="text-xs bg-[#0D121D] border border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500/50"
                />
              </div>

              {/* Item Type & Tag */}
              <div className="space-y-3 pt-1">
                {(() => {
                  const isCurrentCatPastry = isPastryOrFood(categories.find((c) => c.id === categoryId));
                  return isCurrentCatPastry ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                      <p className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Kategori Pastry & Bakery (Tanpa Custom)
                      </p>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        Item dalam kategori pastry otomatis tidak memiliki pilihan varian ice, gula/sweetness, cup size, dan susu. Kasir dapat langsung menambahkan item ke pesanan dengan sekali klik.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-300 font-semibold">Classification</Label>
                        <div className="flex rounded-lg border border-white/10 bg-[#0D121D] p-0.5">
                          <button
                            type="button"
                            onClick={() => setIsBeverage(true)}
                            className={cn(
                              "flex-1 py-1 rounded-md text-xs font-semibold transition",
                              isBeverage
                                ? "bg-[#1E293B] text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                            )}
                          >
                            Beverage
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsBeverage(false)}
                            className={cn(
                              "flex-1 py-1 rounded-md text-xs font-semibold transition",
                              !isBeverage
                                ? "bg-[#1E293B] text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                            )}
                          >
                            Food / Pastry
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="prod-tag" className="text-xs text-slate-300 font-semibold">
                          Highlight Badge (Optional)
                        </Label>
                        <Input
                          id="prod-tag"
                          value={tag}
                          onChange={(e) => setTag(e.target.value)}
                          placeholder="e.g. Best Seller, Barista Pick"
                          className="h-9 text-xs bg-[#0D121D] border border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  );
                })()}

                {isPastryOrFood(categories.find((c) => c.id === categoryId)) && (
                  <div className="space-y-1.5">
                    <Label htmlFor="prod-tag" className="text-xs text-slate-300 font-semibold">
                      Highlight Badge (Optional)
                    </Label>
                    <Input
                      id="prod-tag"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      placeholder="e.g. Best Seller, Freshly Baked"
                      className="h-9 text-xs bg-[#0D121D] border border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500/50"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-[#0D121D] px-6 py-3.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-xs"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs px-5 shadow-sm"
              >
                {editingProduct ? (
                  <>
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Simpan Perubahan Menu</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    <span>Save & Add to POS</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
