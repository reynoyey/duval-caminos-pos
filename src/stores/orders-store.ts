"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { INITIAL_ORDERS } from "@/lib/mock-data";
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
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: INITIAL_ORDERS,
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
          broadcastOrderEvent({ type: "ORDER_CREATED", order });
        }
      },

      updateOrderStatus: (orderId, status, sync = true) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o
          ),
        }));
        if (sync) {
          broadcastOrderEvent({ type: "ORDER_STATUS_CHANGED", orderId, status });
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
      },

      clearAllOrders: () => {
        set({ orders: [], dailyOrderSequence: 0 });
      },

      resetToInitialOrders: () => {
        set({ orders: INITIAL_ORDERS, dailyOrderSequence: 2 });
      },
    }),
    {
      name: "duval-pos-orders-v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        orders: s.orders,
        dailyOrderSequence: s.dailyOrderSequence,
      }),
    }
  )
);
