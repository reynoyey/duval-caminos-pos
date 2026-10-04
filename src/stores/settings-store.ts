"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  cashierName: string;
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  logoUrl: string;

  setCashierName: (name: string) => void;
  setLogoUrl: (url: string) => void;
  setStoreName: (name: string) => void;
  setStoreTagline: (tagline: string) => void;
  setStoreAddress: (address: string) => void;
  resetSettings: () => void;
}

export const DEFAULT_SETTINGS = {
  cashierName: "Alex Rivera",
  storeName: "Duval Caminos Coffee",
  storeTagline: "Specialty Coffee POS & Kitchen Display",
  storeAddress: "Jl. Kebon Jeruk Raya No. 27, Kemanggisan, Palmerah, Jakarta Barat",
  logoUrl: "/logo.jpg",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setCashierName: (cashierName) => set({ cashierName: cashierName.trim() || DEFAULT_SETTINGS.cashierName }),
      setLogoUrl: (logoUrl) => set({ logoUrl }),
      setStoreName: (storeName) => set({ storeName: storeName.trim() || DEFAULT_SETTINGS.storeName }),
      setStoreTagline: (storeTagline) => set({ storeTagline: storeTagline.trim() || DEFAULT_SETTINGS.storeTagline }),
      setStoreAddress: (storeAddress) => set({ storeAddress: storeAddress.trim() || DEFAULT_SETTINGS.storeAddress }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "duval-pos-settings-v2",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

