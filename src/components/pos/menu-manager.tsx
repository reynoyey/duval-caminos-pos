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
import { cn, formatRupiah } from "@/lib/utils";
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
    setCategoryId(categories[0]?.id || "cat-sig");
    setBasePrice("");
    setDescription("");
    setIsBeverage(true);
    setTag("");
    setIsAddModalOpen(true);
  };

  const handleStartEdit = (prod: ProductDTO) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategoryId(prod.categoryId);
    setBasePrice(String(prod.basePrice));
    setDescription(prod.description || "");
    setIsBeverage(prod.isBeverage);
    setTag(prod.tag || "");
    setIsAddModalOpen(true);
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

    if (editingProduct) {
      updateProduct({
        id: editingProduct.id,
        name: name.trim(),
        categoryId,
        basePrice: priceNum,
        description: description.trim() || undefined,
        isBeverage,
        tag: tag.trim() || undefined,
      });
      toast.success(`Berhasil memperbarui menu "${name.trim()}"!`);
    } else {
      const payload: CreateProductPayload = {
        name: name.trim(),
        categoryId,
        basePrice: priceNum,
        description: description.trim() || undefined,
        isBeverage,
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
    if (confirm("Reset katalog menu kembali ke produk default Duval Caminos Coffee?")) {
      resetToDefaultMenu();
      toast.info("Katalog menu dikembalikan ke setelan awal pabrik");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0818] p-4 lg:p-6 overflow-hidden select-none">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-pink-500/20">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Menu Catalog Management</span>
              <span className="text-gradient-miami text-base">🍹</span>
            </h2>
            <span className="rounded-full bg-cyan-400/20 border border-cyan-400/40 px-2.5 py-0.5 text-[10px] font-black text-cyan-300 uppercase tracking-wider shadow-sm shadow-cyan-500/20">
              {products.length} Products
            </span>
          </div>
          <p className="text-xs text-pink-200/70 mt-0.5">
            Tambah, edit, atau hapus minuman specialty & pastry, kelola status ketersediaan (In Stock / Sold Out).
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="border-pink-500/30 bg-[#161033] text-stone-300 hover:bg-pink-500/20 hover:text-white text-xs h-10 transition-all"
            title="Restore original preset items"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-pink-400" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            onClick={handleStartAdd}
            className="bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-extrabold text-xs h-10 px-5 shadow-lg shadow-pink-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 mr-1.5 text-cyan-300" />
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
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
              activeCategory === "ALL"
                ? "bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 text-white shadow-md shadow-pink-600/30"
                : "border border-pink-500/20 bg-[#120E2C]/80 text-stone-300 hover:text-white hover:border-cyan-400/50 hover:bg-[#1b1542]"
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
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                  active
                    ? "bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 text-white shadow-md shadow-pink-600/30"
                    : "border border-pink-500/20 bg-[#120E2C]/80 text-stone-300 hover:text-white hover:border-cyan-400/50 hover:bg-[#1b1542]"
                )}
              >
                <span>{c.name}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-md font-bold",
                  active ? "bg-black/30 text-white" : "bg-[#1E1744] text-cyan-300"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 w-3.5 h-3.5 -translate-y-1/2 text-cyan-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name or SKU..."
            className="h-10 w-full rounded-xl border border-pink-500/25 bg-[#0D0A1F]/90 pr-3 pl-8 text-xs font-medium text-white placeholder:text-stone-500 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Menu Items Table / Cards */}
      <div className="flex-1 overflow-y-auto no-scrollbar rounded-2xl border border-pink-500/20 bg-[#100C29]/80 backdrop-blur-md shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#150F33]/95 text-pink-300 uppercase font-black text-[10px] tracking-wider border-b border-pink-500/25 z-10 backdrop-blur-md">
            <tr>
              <th className="py-3 px-4">Item & SKU</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Base Price</th>
              <th className="py-3 px-4 text-center">Classification</th>
              <th className="py-3 px-4 text-center">Availability</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-500/10 font-medium text-stone-300">
            {filtered.map((prod) => (
              <tr
                key={prod.id}
                className={cn(
                  "hover:bg-pink-500/10 transition-colors",
                  !prod.isAvailable && "opacity-60 bg-[#0c091f]/50"
                )}
              >
                {/* Item & SKU */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-cyan-500/20 border border-pink-500/30 text-cyan-300 shadow-sm shrink-0">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{prod.name}</span>
                        {prod.tag && (
                          <span className="rounded-md bg-pink-500/20 border border-pink-500/40 px-1.5 py-0.2 text-[9px] font-extrabold text-pink-300 uppercase">
                            {prod.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-pink-200/50">
                        <span className="font-mono text-cyan-400 font-semibold">{prod.sku}</span>
                        {prod.description && <span className="truncate max-w-xs text-stone-400">{prod.description}</span>}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="py-3 px-4 text-stone-300 font-medium">{prod.categoryName}</td>

                {/* Base Price */}
                <td className="py-3 px-4 text-right font-mono font-black text-cyan-300 text-sm">
                  {formatRupiah(prod.basePrice)}
                </td>

                {/* Type */}
                <td className="py-3 px-4 text-center">
                  <span
                    className={cn(
                      "rounded-lg px-2.5 py-0.5 text-[10px] font-extrabold uppercase",
                      prod.isBeverage
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                        : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                    )}
                  >
                    {prod.isBeverage ? "Beverage (Cup)" : "Pastry / Food"}
                  </span>
                </td>

                {/* Stock Toggle */}
                <td className="py-3 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => toggleAvailability(prod.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all shadow-sm",
                      prod.isAvailable
                        ? "bg-cyan-950/40 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-900/40"
                        : "bg-red-950/40 text-red-300 border border-red-500/40 hover:bg-red-900/40"
                    )}
                  >
                    {prod.isAvailable ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>In Stock</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span>Sold Out</span>
                      </>
                    )}
                  </button>
                </td>

                {/* Actions (Edit & Delete buttons) */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(prod)}
                      className="text-cyan-300 hover:text-white hover:bg-cyan-500/20 h-8 px-2.5 text-xs font-bold transition-all"
                      title="Edit item menu ini"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1 text-cyan-300" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(prod)}
                      className="text-stone-400 hover:text-pink-400 hover:bg-pink-500/15 h-8 px-2.5 text-xs font-bold transition-all"
                      title="Hapus item menu permanen"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-pink-400" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-pink-200/60 font-medium">
                  Tidak ada item menu ditemukan. Klik tombol "+ Add New Menu Item" di atas untuk menambah menu baru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal (Miami Vibes Dialog) */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg bg-[#100C29] border border-pink-500/30 text-white p-0 overflow-hidden shadow-2xl shadow-pink-950/50">
          <form onSubmit={handleSaveProduct}>
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-600/25 via-rose-900/20 to-[#100C29] px-6 pt-5 pb-4 border-b border-pink-500/20">
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <span>{editingProduct ? "Edit Menu Item" : "Add New Menu Item"}</span>
                <Sparkles className="w-4 h-4 text-cyan-300" />
              </DialogTitle>
              <DialogDescription className="text-xs text-pink-200/70 mt-0.5">
                {editingProduct
                  ? `Perbarui detail "${editingProduct.name}" (${editingProduct.sku}) di katalog register kasir.`
                  : "Buat minuman specialty atau pastry baru langsung ke register kasir POS Duval Caminos."}
              </DialogDescription>
            </div>

            {/* Form Fields */}
            <div className="p-6 space-y-4">
              {/* Product Name */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-name" className="text-xs text-pink-200 font-bold">
                  Product Name <span className="text-pink-400">*</span>
                </Label>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spanish Cortado, Pistachio Latte..."
                  required
                  className="h-10 text-xs bg-[#0B081E] border border-pink-500/25 text-white placeholder:text-stone-500 focus:border-cyan-400"
                />
              </div>

              {/* Category & Price Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-cat" className="text-xs text-pink-200 font-bold">
                    Category
                  </Label>
                  <select
                    id="prod-cat"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="h-10 w-full rounded-md border border-pink-500/25 bg-[#0B081E] px-3 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#100C29] text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-price" className="text-xs text-pink-200 font-bold">
                    Base Price (IDR) <span className="text-pink-400">*</span>
                  </Label>
                  <Input
                    id="prod-price"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="e.g. 32000"
                    required
                    className="h-10 text-xs font-mono font-bold bg-[#0B081E] border border-pink-500/25 text-cyan-300 placeholder:text-stone-500 focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-desc" className="text-xs text-pink-200 font-bold">
                  Flavor Description (Optional)
                </Label>
                <Textarea
                  id="prod-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Double shot espresso with steamed milk and velvety foam..."
                  rows={2}
                  className="text-xs bg-[#0B081E] border border-pink-500/25 text-white placeholder:text-stone-500 focus:border-cyan-400"
                />
              </div>

              {/* Item Type & Tag */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-pink-200 font-bold">Classification</Label>
                  <div className="flex rounded-xl border border-pink-500/25 bg-[#0B081E] p-0.5">
                    <button
                      type="button"
                      onClick={() => setIsBeverage(true)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-bold transition",
                        isBeverage
                          ? "bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow-sm"
                          : "text-stone-400 hover:text-white"
                      )}
                    >
                      Beverage
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBeverage(false)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-bold transition",
                        !isBeverage
                          ? "bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow-sm"
                          : "text-stone-400 hover:text-white"
                      )}
                    >
                      Food / Pastry
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prod-tag" className="text-xs text-pink-200 font-bold">
                    Highlight Badge (Optional)
                  </Label>
                  <Input
                    id="prod-tag"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="e.g. Best Seller, Barista Pick"
                    className="h-10 text-xs bg-[#0B081E] border border-pink-500/25 text-white placeholder:text-stone-500 focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-pink-500/20 bg-[#0B081E] px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="border-pink-500/30 text-stone-300 hover:bg-pink-500/10 hover:text-white text-xs"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-extrabold text-xs px-6 shadow-lg shadow-pink-600/40"
              >
                {editingProduct ? (
                  <>
                    <Edit3 className="w-4 h-4 mr-1.5 text-cyan-300" />
                    <span>Simpan Perubahan Menu</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5 text-cyan-300" />
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
