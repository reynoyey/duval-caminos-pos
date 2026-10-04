"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OrderRecordDTO, OrderStatus } from "@/lib/types";
import { broadcastOrderEvent } from "@/lib/supabase";

export type OrderFilter = "ALL" | "PROCESSING" | "COMPLETED" | "CANCELLED";

interface OrdersState {
  orders: OrderRecordDTO[];
  dailyOrderSequence: number;
  filter: OrderFilter;
  searchQuery: string;
  lastResetTimestamp: number;

  setFilter: (filter: OrderFilter) => void;
  setSearchQuery: (query: string) => void;

  getNextOrderNumber: () => { queueNumber: number; orderNumber: string };
  addOrder: (order: OrderRecordDTO, sync?: boolean) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, sync?: boolean, isCollected?: boolean) => void;
  markCompleted: (orderId: string) => void;
  markProcessing: (orderId: string) => void;
  markCollected: (orderId: string) => void;
  restoreToPickup: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  deleteOrderRecord: (orderId: string) => void;
  clearAllOrders: () => void;
  resetToInitialOrders: () => void;

  // Realtime multi-device cloud synchronization
  syncRemoteOrders: (remoteOrders: OrderRecordDTO[], remoteResetTimestamp?: number, remoteDeletedIds?: string[]) => void;
  fetchLatestOrders: () => Promise<void>;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      dailyOrderSequence: 0,
      filter: "ALL",
      searchQuery: "",
      lastResetTimestamp: 0,

      setFilter: (filter) => set({ filter }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      getNextOrderNumber: () => {
        const currentSeq = get().dailyOrderSequence || 0;
        const maxExisting = get().orders.reduce((m, o) => Math.max(m, o.queueNumber || 0), 0);
        const nextSeq = Math.max(currentSeq, maxExisting) + 1;
        set({ dailyOrderSequence: nextSeq });

        const now = new Date();
        const dateKey = now.toISOString().slice(2, 10).replace(/-/g, "");
        const orderNumber = `DCC-${dateKey}-${String(nextSeq).padStart(4, "0")}`;
        return { queueNumber: nextSeq, orderNumber };
      },

      addOrder: (order, sync = true) => {
        set((state) => ({
          orders: [order, ...state.orders.filter((o) => o.id !== order.id)],
          dailyOrderSequence: Math.max(state.dailyOrderSequence || 0, order.queueNumber || 0),
        }));

        if (sync) {
          // 1. Local bus
          broadcastOrderEvent({ type: "ORDER_CREATED", order });
          // 2. Cloud server sync to /api/orders (persists & informs other devices)
          fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order),
          }).catch((err) => console.warn("Cloud addOrder sync error:", err));
        }
      },

      updateOrderStatus: (orderId, status, sync = true, isCollected?: boolean) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status,
                  ...(isCollected !== undefined ? { isCollected, collectedAt: isCollected ? nowIso : undefined } : {}),
                  updatedAt: nowIso,
                }
              : o
          ),
        }));

        if (sync) {
          // 1. Local bus
          broadcastOrderEvent({ type: "ORDER_STATUS_CHANGED", orderId, status, isCollected });
          // 2. Cloud server sync
          fetch("/api/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, status, isCollected }),
          }).catch((err) => console.warn("Cloud updateOrderStatus sync error:", err));
        }
      },

      markCompleted: (orderId) => {
        get().updateOrderStatus(orderId, "COMPLETED", true, false);
      },

      markProcessing: (orderId) => {
        get().updateOrderStatus(orderId, "PROCESSING", true, false);
      },

      markCollected: (orderId) => {
        get().updateOrderStatus(orderId, "COMPLETED", true, true);
      },

      restoreToPickup: (orderId) => {
        get().updateOrderStatus(orderId, "COMPLETED", true, false);
      },

      cancelOrder: (orderId) => {
        get().updateOrderStatus(orderId, "CANCELLED");
      },

      deleteOrderRecord: (orderId) => {
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== orderId),
        }));
        fetch("/api/orders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        }).catch((err) => console.warn("Cloud deleteOrder error:", err));
      },

      clearAllOrders: () => {
        const now = Date.now();
        set({ orders: [], dailyOrderSequence: 0, lastResetTimestamp: now });
        fetch("/api/orders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetAll: true }),
        }).catch((err) => console.warn("Cloud clearAllOrders error:", err));
      },

      resetToInitialOrders: () => {
        set({ orders: [], dailyOrderSequence: 0 });
      },

      // Merge remote orders intelligently without ever dropping valid local orders
      syncRemoteOrders: (remoteOrders, remoteResetTimestamp, remoteDeletedIds) => {
        if (!remoteOrders || !Array.isArray(remoteOrders)) return;

        set((state) => {
          // 1. If another device performed an authorized Reset Harian, honor the reset
          if (remoteResetTimestamp && remoteResetTimestamp > (state.lastResetTimestamp || 0)) {
            return {
              orders: [],
              dailyOrderSequence: 0,
              lastResetTimestamp: remoteResetTimestamp,
            };
          }

          const deletedSet = new Set(remoteDeletedIds || []);

          // 2. Start by keeping ALL existing local orders (unless explicitly deleted)
          const map = new Map<string, OrderRecordDTO>();
          for (const lo of state.orders) {
            if (!deletedSet.has(lo.id)) {
              map.set(lo.id, lo);
            }
          }

          // 3. Merge in remote orders from other devices
          for (const ro of remoteOrders) {
            if (deletedSet.has(ro.id)) continue;

            const existing = map.get(ro.id);
            if (!existing) {
              // New order placed on another device -> Add it immediately!
              map.set(ro.id, ro);
            } else {
              // Existing order -> update status if changed or if remote is newer
              const isStatusChanged = ro.status !== existing.status;
              const isRemoteNewer = ro.updatedAt && (!existing.updatedAt || ro.updatedAt >= existing.updatedAt);
              if (isStatusChanged || isRemoteNewer) {
                map.set(ro.id, { ...existing, ...ro });
              }
            }
          }

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          // Skip state update if nothing has changed
          if (
            merged.length === state.orders.length &&
            merged.every((m, idx) => {
              const prev = state.orders[idx];
              return (
                prev &&
                prev.id === m.id &&
                prev.status === m.status &&
                prev.isCollected === m.isCollected &&
                prev.updatedAt === m.updatedAt
              );
            })
          ) {
            return state;
          }

          const maxSeq = merged.reduce((m, o) => Math.max(m, o.queueNumber || 0), 0);

          return {
            orders: merged,
            dailyOrderSequence: Math.max(state.dailyOrderSequence || 0, maxSeq),
          };
        });
      },

      // Fetch latest orders from the cloud API with two-way self-healing
      fetchLatestOrders: async () => {
        try {
          const res = await fetch("/api/orders", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (data && Array.isArray(data.orders)) {
            get().syncRemoteOrders(data.orders, data.resetTimestamp, data.deletedOrderIds);

            // Two-way self-healing: if server has fewer orders than client and wasn't reset,
            // push any missing local active orders to the server so other devices get them!
            const currentOrders = get().orders;
            if (currentOrders.length > 0 && data.orders.length < currentOrders.length) {
              const serverOrderIds = new Set(data.orders.map((o: any) => o.id));
              const missingOnServer = currentOrders.filter((o) => !serverOrderIds.has(o.id));
              for (const missing of missingOnServer) {
                fetch("/api/orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(missing),
                }).catch(() => null);
              }
            }
          }
        } catch (err) {
          console.warn("fetchLatestOrders error:", err);
        }
      },
    }),
    {
      name: "duval-pos-orders-v4",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        orders: s.orders,
        dailyOrderSequence: s.dailyOrderSequence,
        lastResetTimestamp: s.lastResetTimestamp,
      }),
    }
  )
);
