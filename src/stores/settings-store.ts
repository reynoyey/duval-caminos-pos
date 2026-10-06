"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { broadcastSettingsEvent, type SettingsSyncEvent } from "@/lib/supabase";

export interface SettingsState {
  cashierName: string;
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  logoUrl: string;
  updatedAt: string;

  setCashierName: (name: string, broadcast?: boolean) => void;
  setLogoUrl: (url: string, broadcast?: boolean) => void;
  setStoreName: (name: string, broadcast?: boolean) => void;
  setStoreTagline: (tagline: string, broadcast?: boolean) => void;
  setStoreAddress: (address: string, broadcast?: boolean) => void;
  saveAllSettings: (
    settings: {
      cashierName?: string;
      storeName?: string;
      storeTagline?: string;
      storeAddress?: string;
      logoUrl?: string;
    },
    broadcast?: boolean
  ) => void;
  resetSettings: (broadcast?: boolean) => void;
  applyRemoteSettingsEvent: (event: SettingsSyncEvent) => void;
  fetchLatestSettings: () => Promise<void>;
}

export const DEFAULT_SETTINGS = {
  cashierName: "Alex Rivera",
  storeName: "Duval Caminos Coffee",
  storeTagline: "Specialty Coffee POS & Kitchen Display",
  storeAddress: "Jl. Kebon Jeruk Raya No. 27, Kemanggisan, Palmerah, Jakarta Barat",
  logoUrl: "/logo.jpg",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      saveAllSettings: (newSettings, broadcast = true) => {
        const current = get();
        const updated = {
          cashierName: (newSettings.cashierName ?? current.cashierName).trim() || DEFAULT_SETTINGS.cashierName,
          storeName: (newSettings.storeName ?? current.storeName).trim() || DEFAULT_SETTINGS.storeName,
          storeTagline: (newSettings.storeTagline ?? current.storeTagline).trim() || DEFAULT_SETTINGS.storeTagline,
          storeAddress: (newSettings.storeAddress ?? current.storeAddress).trim() || DEFAULT_SETTINGS.storeAddress,
          logoUrl: newSettings.logoUrl ?? current.logoUrl,
          updatedAt: new Date().toISOString(),
        };

        set(updated);

        if (broadcast) {
          broadcastSettingsEvent({
            type: "SETTINGS_UPDATED",
            settings: updated,
          });

          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          }).catch((err) => console.warn("Failed to persist settings to server:", err));
        }
      },

      setCashierName: (name, broadcast = true) => {
        get().saveAllSettings({ cashierName: name }, broadcast);
      },

      setLogoUrl: (url, broadcast = true) => {
        get().saveAllSettings({ logoUrl: url }, broadcast);
      },

      setStoreName: (name, broadcast = true) => {
        get().saveAllSettings({ storeName: name }, broadcast);
      },

      setStoreTagline: (tagline, broadcast = true) => {
        get().saveAllSettings({ storeTagline: tagline }, broadcast);
      },

      setStoreAddress: (address, broadcast = true) => {
        get().saveAllSettings({ storeAddress: address }, broadcast);
      },

      resetSettings: (broadcast = true) => {
        const resetData = {
          ...DEFAULT_SETTINGS,
          updatedAt: new Date().toISOString(),
        };
        set(resetData);

        if (broadcast) {
          broadcastSettingsEvent({
            type: "SETTINGS_UPDATED",
            settings: resetData,
          });
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resetData),
          }).catch(() => null);
        }
      },

      applyRemoteSettingsEvent: (event: SettingsSyncEvent) => {
        if (event.type === "SETTINGS_UPDATED" && event.settings) {
          set((state) => {
            const incomingTime = event.settings.updatedAt ? new Date(event.settings.updatedAt).getTime() : 0;
            const currentTime = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;

            // Only update if incoming is newer or equal
            if (incomingTime >= currentTime || !currentTime) {
              return {
                cashierName: event.settings.cashierName || state.cashierName,
                storeName: event.settings.storeName || state.storeName,
                storeTagline: event.settings.storeTagline || state.storeTagline,
                storeAddress: event.settings.storeAddress !== undefined ? event.settings.storeAddress : state.storeAddress,
                logoUrl: event.settings.logoUrl || state.logoUrl,
                updatedAt: event.settings.updatedAt || new Date().toISOString(),
              };
            }
            return state;
          });
        }
      },

      fetchLatestSettings: async () => {
        try {
          const res = await fetch("/api/settings", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (data && data.success && data.settings) {
            const remote = data.settings;
            set((state) => {
              const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
              const localTime = state.updatedAt ? new Date(state.updatedAt).getTime() : 0;
              // If remote is newer, sync state
              if (remoteTime >= localTime) {
                return {
                  cashierName: remote.cashierName || state.cashierName,
                  storeName: remote.storeName || state.storeName,
                  storeTagline: remote.storeTagline || state.storeTagline,
                  storeAddress: remote.storeAddress !== undefined ? remote.storeAddress : state.storeAddress,
                  logoUrl: remote.logoUrl || state.logoUrl,
                  updatedAt: remote.updatedAt || state.updatedAt,
                };
              }
              return state;
            });
          }
        } catch (err) {
          console.warn("fetchLatestSettings error:", err);
        }
      },
    }),
    {
      name: "duval-pos-settings-v3",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
