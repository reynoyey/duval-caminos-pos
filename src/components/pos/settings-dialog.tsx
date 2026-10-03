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
    storeAddress,
    logoUrl,
    setCashierName,
    setLogoUrl,
    setStoreName,
    setStoreTagline,
    setStoreAddress,
    resetSettings,
  } = useSettingsStore();

  const clearAllOrders = useOrdersStore((s) => s.clearAllOrders);
  const ordersCount = useOrdersStore((s) => s.orders.length);

  // Local draft state
  const [draftCashier, setDraftCashier] = useState(cashierName);
  const [draftStoreName, setDraftStoreName] = useState(storeName);
  const [draftAddress, setDraftAddress] = useState(storeAddress || DEFAULT_SETTINGS.storeAddress);
  const [draftLogo, setDraftLogo] = useState(logoUrl);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
    setStoreAddress(draftAddress.trim() || DEFAULT_SETTINGS.storeAddress);
    setLogoUrl(draftLogo || DEFAULT_SETTINGS.logoUrl);
    toast.success("Pengaturan kasir & logo berhasil disimpan!");
    onOpenChange(false);
  };

  const handleExecuteReset = () => {
    clearAllOrders();
    setShowResetConfirm(false);
    toast.success("Semua transaksi hari ini telah di-reset! Nomor antrean kembali ke #1 untuk shift besok.");
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg bg-[#111726] border border-white/10 text-white p-0 overflow-hidden shadow-2xl shadow-black/80">
          {/* Header */}
          <div className="bg-[#161F30] px-6 pt-5 pb-4 border-b border-white/10">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <span>Pengaturan Kasir & Toko</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-0.5">
              Ubah nama kasir/server yang bertugas, ganti logo kafe, atau kosongkan order untuk hari baru.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
            {/* Section 1: Server / Cashier Name */}
            <div className="space-y-2 rounded-xl border border-white/10 bg-[#0E131F] p-4">
              <div className="flex items-center gap-2 text-slate-300">
                <User className="w-4 h-4 text-cyan-400" />
                <Label htmlFor="cashier-name" className="text-xs font-semibold uppercase tracking-wider">
                  Nama Kasir / Server Bertugas
                </Label>
              </div>
              <p className="text-[11px] text-slate-400">
                Nama ini akan tercetak di struk nota pelanggan, tiket barista, dan laporan shift.
              </p>
              <Input
                id="cashier-name"
                value={draftCashier}
                onChange={(e) => setDraftCashier(e.target.value)}
                placeholder="Contoh: Alex Rivera, Reyno, Sarah..."
                className="h-10 text-xs bg-[#161F30] border border-white/10 text-white font-medium focus:border-cyan-400"
              />
            </div>

            {/* Section 2: Store Logo Upload & Preview */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#0E131F] p-4">
              <div className="flex items-center gap-2 text-slate-300">
                <ImageIcon className="w-4 h-4 text-rose-400" />
                <Label className="text-xs font-semibold uppercase tracking-wider">
                  Logo Kafe / Brand
                </Label>
              </div>
              <p className="text-[11px] text-slate-400">
                Logo akan ditampilkan pada pojok kiri atas aplikasi kasir dan di struk thermal.
              </p>

              {/* Logo Preview & Upload Controls */}
              <div className="flex items-center gap-4 pt-1">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden ring-1 ring-white/10 bg-[#161F30] flex items-center justify-center shrink-0">
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
                    className="border-white/10 bg-[#161F30] text-cyan-300 hover:bg-white/10 hover:text-white text-xs h-9 w-full font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload Gambar Logo Baru
                  </Button>

                  <div className="flex items-center gap-2">
                    <Input
                      value={draftLogo}
                      onChange={(e) => setDraftLogo(e.target.value)}
                      placeholder="Atau tempel URL gambar..."
                      className="h-8 text-[11px] bg-[#161F30] border border-white/10 text-slate-200 font-mono flex-1"
                    />
                    {draftLogo !== DEFAULT_SETTINGS.logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDraftLogo(DEFAULT_SETTINGS.logoUrl)}
                        className="text-slate-400 hover:text-white text-[10px] h-8 px-2"
                        title="Kembalikan ke logo default"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Store Name & Address */}
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#0E131F] p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <Store className="w-4 h-4 text-cyan-400" />
                  <Label htmlFor="store-name" className="text-xs font-semibold uppercase tracking-wider">
                    Nama Kafe / Resto
                  </Label>
                </div>
                <Input
                  id="store-name"
                  value={draftStoreName}
                  onChange={(e) => setDraftStoreName(e.target.value)}
                  placeholder="Duval Caminos Coffee"
                  className="h-10 text-xs bg-[#161F30] border border-white/10 text-white font-medium focus:border-cyan-400"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <Label htmlFor="store-address" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Alamat Outlet (Tercetak di Struk)
                </Label>
                <Input
                  id="store-address"
                  value={draftAddress}
                  onChange={(e) => setDraftAddress(e.target.value)}
                  placeholder="Jl. Kebon Jeruk Raya No. 27..."
                  className="h-10 text-xs bg-[#161F30] border border-white/10 text-white font-medium focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Section 4: End of Day - Reset All Orders */}
            <div className="rounded-xl border border-red-500/25 bg-red-950/15 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Tutup Kasir / Reset Akhir Hari
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-300 font-bold">
                  {ordersCount} order aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Gunakan tombol ini saat pergantian hari / tutup shift malam agar antrean pesanan besok pagi bersih dan nomor order kembali ke <strong>#1</strong>.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (ordersCount === 0) {
                    toast.info("Daftar pesanan sudah kosong");
                    return;
                  }
                  setShowResetConfirm(true);
                }}
                className="border-red-500/30 bg-red-950/30 hover:bg-red-900/40 text-red-200 font-semibold text-xs h-9 w-full transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-400" />
                Reset Semua Order (Kosongkan untuk Besok)
              </Button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-white/10 bg-[#111726] px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white text-xs"
            >
              Batal
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-6 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-white" />
              Simpan Pengaturan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SAFETY CONFIRMATION MODAL TO PREVENT ACCIDENTAL RESET */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-md bg-[#16111D] border-2 border-red-500/50 text-white p-0 overflow-hidden shadow-2xl shadow-red-950/60 z-50">
          <div className="bg-red-950/40 px-5 pt-4 pb-3 border-b border-red-500/30 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-red-200">
                Konfirmasi Reset Akhir Hari
              </DialogTitle>
              <DialogDescription className="text-xs text-red-300/80">
                Pencegahan Tombol Tidak Sengaja Tertekan
              </DialogDescription>
            </div>
          </div>

          <div className="p-5 space-y-3 text-xs">
            <p className="text-slate-200 leading-relaxed font-medium">
              Apakah Anda benar-benar yakin ingin <strong>MENGOSONGKAN SEMUA {ordersCount} ORDER</strong> hari ini?
            </p>
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3 space-y-1 text-slate-300 text-[11px]">
              <div className="flex items-center gap-1.5 text-red-300 font-semibold">
                <span>• Antrean pesanan aktif akan dibersihkan dari layar</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-300 font-semibold">
                <span>• Nomor order berikutnya akan kembali dimulai dari antrean #1</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 bg-[#100D16] px-5 py-3.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
              className="border-white/10 text-slate-300 hover:bg-white/10 text-xs h-9 px-4"
            >
              Batal / Amankan Data
            </Button>

            <Button
              type="button"
              onClick={handleExecuteReset}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs h-9 px-4 shadow-md shadow-red-950/50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Ya, Kosongkan & Reset ke #1
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

