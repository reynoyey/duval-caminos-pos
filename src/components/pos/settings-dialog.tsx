"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Settings,
  User,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { useSettingsStore, DEFAULT_SETTINGS } from "@/stores/settings-store";
import { useOrdersStore } from "@/stores/orders-store";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: Props) {
  const {
    cashierName,
    storeName,
    storeTagline,
    logoUrl,
    setCashierName,
    setLogoUrl,
    setStoreName,
    setStoreTagline,
    resetSettings,
  } = useSettingsStore();

  const clearAllOrders = useOrdersStore((s) => s.clearAllOrders);
  const ordersCount = useOrdersStore((s) => s.orders.length);

  // Local draft state
  const [draftCashier, setDraftCashier] = useState(cashierName);
  const [draftStoreName, setDraftStoreName] = useState(storeName);
  const [draftLogo, setDraftLogo] = useState(logoUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Harap pilih file gambar (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setDraftLogo(result);
        toast.success("Logo baru berhasil dimuat!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setCashierName(draftCashier.trim() || DEFAULT_SETTINGS.cashierName);
    setStoreName(draftStoreName.trim() || DEFAULT_SETTINGS.storeName);
    setLogoUrl(draftLogo || DEFAULT_SETTINGS.logoUrl);
    toast.success("Pengaturan kasir & logo berhasil disimpan!");
    onOpenChange(false);
  };

  const handleResetOrdersEndOfDay = () => {
    if (ordersCount === 0) {
      toast.info("Daftar pesanan sudah kosong");
      return;
    }
    if (
      confirm(
        `PERINGATAN AKHIR HARI:\n\nApakah Anda yakin ingin MENGOSONGKAN SEMUA ${ordersCount} ORDER hari ini?\n\nLakukan ini saat toko tutup agar besok pagi antrean bersih dari nol.`
      )
    ) {
      clearAllOrders();
      toast.success("Semua transaksi hari ini telah di-reset! Siap untuk buka shift besok.");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#100C29] border border-pink-500/30 text-white p-0 overflow-hidden shadow-2xl shadow-pink-950/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600/25 via-rose-900/20 to-[#100C29] px-6 pt-5 pb-4 border-b border-pink-500/20">
          <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-300" />
            <span>Pengaturan Kasir & Toko</span>
            <Sparkles className="w-4 h-4 text-pink-400" />
          </DialogTitle>
          <DialogDescription className="text-xs text-pink-200/70 mt-0.5">
            Ubah nama kasir/server yang bertugas, ganti logo kafe, atau kosongkan order untuk hari baru.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto no-scrollbar">
          {/* Section 1: Server / Cashier Name */}
          <div className="space-y-2 rounded-2xl border border-pink-500/20 bg-[#0B081E] p-4">
            <div className="flex items-center gap-2 text-pink-200">
              <User className="w-4 h-4 text-cyan-400" />
              <Label htmlFor="cashier-name" className="text-xs font-bold uppercase tracking-wider">
                Nama Kasir / Server Bertugas
              </Label>
            </div>
            <p className="text-[11px] text-pink-200/60">
              Nama ini akan tercetak di struk nota pelanggan, tiket barista, dan laporan shift.
            </p>
            <Input
              id="cashier-name"
              value={draftCashier}
              onChange={(e) => setDraftCashier(e.target.value)}
              placeholder="Contoh: Alex Rivera, Reyno, Sarah..."
              className="h-10 text-xs bg-[#100C29] border border-pink-500/25 text-white font-semibold focus:border-cyan-400"
            />
          </div>

          {/* Section 2: Store Logo Upload & Preview */}
          <div className="space-y-3 rounded-2xl border border-pink-500/20 bg-[#0B081E] p-4">
            <div className="flex items-center gap-2 text-pink-200">
              <ImageIcon className="w-4 h-4 text-pink-400" />
              <Label className="text-xs font-bold uppercase tracking-wider">
                Logo Kafe / Brand
              </Label>
            </div>
            <p className="text-[11px] text-pink-200/60">
              Logo akan ditampilkan pada pojok kiri atas aplikasi kasir dan di struk thermal.
            </p>

            {/* Logo Preview & Upload Controls */}
            <div className="flex items-center gap-4 pt-1">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-pink-500/50 bg-[#161033] flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
                <Image
                  src={draftLogo || "/logo.jpg"}
                  alt="Store Logo Preview"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-pink-500/30 bg-[#150F33] text-cyan-300 hover:bg-pink-500/20 hover:text-white text-xs h-9 w-full font-bold"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Gambar Logo Baru
                </Button>

                <div className="flex items-center gap-2">
                  <Input
                    value={draftLogo}
                    onChange={(e) => setDraftLogo(e.target.value)}
                    placeholder="Atau tempel URL gambar..."
                    className="h-8 text-[11px] bg-[#100C29] border border-pink-500/25 text-stone-200 font-mono flex-1"
                  />
                  {draftLogo !== DEFAULT_SETTINGS.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDraftLogo(DEFAULT_SETTINGS.logoUrl)}
                      className="text-stone-400 hover:text-pink-300 text-[10px] h-8 px-2"
                      title="Kembalikan ke logo default"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Store Name (Optional edit) */}
          <div className="space-y-2 rounded-2xl border border-pink-500/20 bg-[#0B081E] p-4">
            <div className="flex items-center gap-2 text-pink-200">
              <Store className="w-4 h-4 text-cyan-400" />
              <Label htmlFor="store-name" className="text-xs font-bold uppercase tracking-wider">
                Nama Kafe / Resto
              </Label>
            </div>
            <Input
              id="store-name"
              value={draftStoreName}
              onChange={(e) => setDraftStoreName(e.target.value)}
              placeholder="Duval Caminos Coffee"
              className="h-10 text-xs bg-[#100C29] border border-pink-500/25 text-white font-semibold focus:border-cyan-400"
            />
          </div>

          {/* Section 4: End of Day - Reset All Orders */}
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Tutup Kasir / Reset Akhir Hari
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-300 font-bold">
                {ordersCount} order aktif
              </span>
            </div>
            <p className="text-[11px] text-stone-300 leading-relaxed">
              Gunakan tombol ini saat pergantian hari / tutup shift malam agar antrean pesanan besok pagi bersih dan kosong.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetOrdersEndOfDay}
              className="border-red-500/40 bg-red-950/40 hover:bg-red-900/60 text-red-200 font-black text-xs h-9 w-full transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-400" />
              Reset Semua Order (Kosongkan untuk Besok)
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-pink-500/20 bg-[#0B081E] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-pink-500/30 text-stone-300 hover:bg-pink-500/10 hover:text-white text-xs"
          >
            Batal
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            className="bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-extrabold text-xs px-6 shadow-lg shadow-pink-600/40"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-cyan-300" />
            Simpan Pengaturan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
