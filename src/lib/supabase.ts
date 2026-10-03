import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { OrderRecordDTO, ProductDTO } from "./types";

const DEFAULT_SUPABASE_URL = "https://wafeaoqxmdxemhynvbjn.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_lyYoIWqGFTZl_gNuk9zr2A_08rDJiqt";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client && supabaseUrl && supabaseAnonKey) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
  }
  return client;
}

// ============================================================================
//  REALTIME SYNCHRONIZATION ENGINE
//  Dual-layer sync:
//  1. Local BroadcastChannel API (zero-latency, offline-first cross-tab/screen)
//  2. Supabase Realtime WebSockets (cross-device: Cashier tablet <-> Kitchen TV <-> Phone)
// ============================================================================

export type OrderSyncEvent =
  | { type: "ORDER_CREATED"; order: OrderRecordDTO }
  | { type: "ORDER_STATUS_CHANGED"; orderId: string; status: OrderRecordDTO["status"] }
  | { type: "ORDER_DELETED"; orderId: string };

export type MenuSyncEvent =
  | { type: "PRODUCT_ADDED"; product: ProductDTO }
  | { type: "PRODUCT_UPDATED"; product: ProductDTO }
  | { type: "PRODUCT_DELETED"; productId: string }
  | { type: "PRODUCT_AVAILABILITY_TOGGLED"; productId: string; isAvailable: boolean }
  | { type: "CATALOG_RESET" }
  | { type: "CATALOG_SYNC"; products: ProductDTO[] };

const LOCAL_ORDERS_CHANNEL = "duval-caminos-orders-bus";
const LOCAL_MENU_CHANNEL = "duval-caminos-menu-bus";

// ----------------------------------------------------------------------------
//  ORDERS SYNC
// ----------------------------------------------------------------------------

/** Broadcast order event to other tabs/windows locally and via Supabase across devices */
export function broadcastOrderEvent(event: OrderSyncEvent) {
  // 1. Local BroadcastChannel (immediate same-device sync)
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(LOCAL_ORDERS_CHANNEL);
      channel.postMessage(event);
      channel.close();
    } catch (e) {
      console.warn("Local broadcast orders error", e);
    }
  }

  // 2. Supabase Realtime broadcast (cross-device sync)
  const sb = getSupabaseClient();
  if (sb) {
    const channel = sb.channel("pos-live-orders");
    channel
      .send({
        type: "broadcast",
        event: event.type,
        payload: event,
      })
      .catch((e) => {
        console.warn("Supabase realtime broadcast orders error", e);
      });
  }
}

/** Listen to order events from both Supabase and Local BroadcastChannel */
export function subscribeToOrders(onEvent: (event: OrderSyncEvent) => void) {
  const cleanups: (() => void)[] = [];

  // 1. Local BroadcastChannel listener
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const localChannel = new BroadcastChannel(LOCAL_ORDERS_CHANNEL);
    const handleMessage = (evt: MessageEvent<OrderSyncEvent>) => {
      if (evt.data && evt.data.type) {
        onEvent(evt.data);
      }
    };
    localChannel.addEventListener("message", handleMessage);
    cleanups.push(() => {
      localChannel.removeEventListener("message", handleMessage);
      localChannel.close();
    });
  }

  // 2. Supabase Realtime listener (cross-device)
  const sb = getSupabaseClient();
  if (sb) {
    const channel = sb
      .channel("pos-live-orders")
      .on("broadcast", { event: "*" }, (payload) => {
        if (payload.payload) {
          onEvent(payload.payload as OrderSyncEvent);
        }
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "Order" },
        (payload) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            onEvent({
              type: "ORDER_STATUS_CHANGED",
              orderId: (payload.new as any).id,
              status: (payload.new as any).status,
            });
          }
        }
      )
      .subscribe();

    cleanups.push(() => {
      sb.removeChannel(channel);
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

// ----------------------------------------------------------------------------
//  MENU / CATALOG SYNC
// ----------------------------------------------------------------------------

/** Broadcast menu event to other devices via Supabase and tabs locally */
export function broadcastMenuEvent(event: MenuSyncEvent) {
  // 1. Local BroadcastChannel (immediate same-device sync)
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(LOCAL_MENU_CHANNEL);
      channel.postMessage(event);
      channel.close();
    } catch (e) {
      console.warn("Local broadcast menu error", e);
    }
  }

  // 2. Supabase Realtime broadcast (cross-device sync)
  const sb = getSupabaseClient();
  if (sb) {
    const channel = sb.channel("pos-live-menu");
    channel
      .send({
        type: "broadcast",
        event: event.type,
        payload: event,
      })
      .catch((e) => {
        console.warn("Supabase realtime broadcast menu error", e);
      });
  }
}

/** Listen to menu changes from other devices in real-time */
export function subscribeToMenu(onEvent: (event: MenuSyncEvent) => void) {
  const cleanups: (() => void)[] = [];

  // 1. Local BroadcastChannel listener
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const localChannel = new BroadcastChannel(LOCAL_MENU_CHANNEL);
    const handleMessage = (evt: MessageEvent<MenuSyncEvent>) => {
      if (evt.data && evt.data.type) {
        onEvent(evt.data);
      }
    };
    localChannel.addEventListener("message", handleMessage);
    cleanups.push(() => {
      localChannel.removeEventListener("message", handleMessage);
      localChannel.close();
    });
  }

  // 2. Supabase Realtime listener (cross-device)
  const sb = getSupabaseClient();
  if (sb) {
    const channel = sb
      .channel("pos-live-menu")
      .on("broadcast", { event: "*" }, (payload) => {
        if (payload.payload) {
          onEvent(payload.payload as MenuSyncEvent);
        }
      })
      .subscribe();

    cleanups.push(() => {
      sb.removeChannel(channel);
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
