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

  setFilter: (filter: OrderFilter) => void;
  setSearchQuery: (query: string) => void;

  getNextOrderNumber: () => { queueNumber: number; orderNumber: string };
  addOrder: (order: OrderRecordDTO, sync?: boolean) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, sync?: boolean) => void;
  markCompleted: (orderId: string) => void;
  markProcessing: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  deleteOrderRecord: (orderId: string) => void;
  clearAllOrders: () => void;
  resetToInitialOrders: () => void;

  // Realtime multi-device cloud synchronization
  syncRemoteOrders: (remoteOrders: OrderRecordDTO[]) => void;
  fetchLatestOrders: () => Promise<void>;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      dailyOrderSequence: 0,
      filter: "ALL",
      searchQuery: "",

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

      updateOrderStatus: (orderId, status, sync = true) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status, updatedAt: nowIso } : o
          ),
        }));

        if (sync) {
          // 1. Local bus
          broadcastOrderEvent({ type: "ORDER_STATUS_CHANGED", orderId, status });
          // 2. Cloud server sync
          fetch("/api/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, status }),
          }).catch((err) => console.warn("Cloud updateOrderStatus sync error:", err));
        }
      },

      markCompleted: (orderId) => {
        get().updateOrderStatus(orderId, "COMPLETED");
      },

      markProcessing: (orderId) => {
        get().updateOrderStatus(orderId, "PROCESSING");
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
        set({ orders: [], dailyOrderSequence: 0 });
        fetch("/api/orders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetAll: true }),
        }).catch((err) => console.warn("Cloud clearAllOrders error:", err));
      },

      resetToInitialOrders: () => {
        set({ orders: [], dailyOrderSequence: 0 });
      },

      // Merge remote orders intelligently without overriding optimistic updates
      syncRemoteOrders: (remoteOrders) => {
        if (!remoteOrders || !Array.isArray(remoteOrders)) return;

        set((state) => {
          const map = new Map<string, OrderRecordDTO>();
          for (const ord of state.orders) {
            map.set(ord.id, ord);
          }

          let changed = false;
          for (const ro of remoteOrders) {
            const existing = map.get(ro.id);
            if (!existing) {
              map.set(ro.id, ro);
              changed = true;
            } else {
              // If status changed or remote updatedAt is newer
              if (
                existing.status !== ro.status ||
                (ro.updatedAt && (!existing.updatedAt || ro.updatedAt > existing.updatedAt))
              ) {
                map.set(ro.id, { ...existing, ...ro });
                changed = true;
              }
            }
          }

          if (!changed && map.size === state.orders.length) {
            return state;
          }

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const maxSeq = merged.reduce((m, o) => Math.max(m, o.queueNumber || 0), 0);

          return {
            orders: merged,
            dailyOrderSequence: Math.max(state.dailyOrderSequence || 0, maxSeq),
          };
        });
      },

      // Fetch latest orders from the cloud API
      fetchLatestOrders: async () => {
        try {
          const res = await fetch("/api/orders", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (data && Array.isArray(data.orders)) {
            get().syncRemoteOrders(data.orders);
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
      }),
    }
  )
);
