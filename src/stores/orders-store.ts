"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { INITIAL_ORDERS } from "@/lib/mock-data";
import type { OrderRecordDTO, OrderStatus } from "@/lib/types";
import { broadcastOrderEvent } from "@/lib/supabase";

export type OrderFilter = "ALL" | "PROCESSING" | "COMPLETED" | "CANCELLED";

interface OrdersState {
  orders: OrderRecordDTO[];
  filter: OrderFilter;
  searchQuery: string;

  setFilter: (filter: OrderFilter) => void;
  setSearchQuery: (query: string) => void;

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
      filter: "ALL",
      searchQuery: "",

      setFilter: (filter) => set({ filter }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      addOrder: (order, sync = true) => {
        set((state) => ({
          orders: [order, ...state.orders.filter((o) => o.id !== order.id)],
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
        set({ orders: [] });
      },

      resetToInitialOrders: () => {
        set({ orders: INITIAL_ORDERS });
      },
    }),
    {
      name: "duval-pos-orders-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        orders: s.orders,
      }),
    }
  )
);
