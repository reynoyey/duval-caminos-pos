import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { OrderRecordDTO, ProductDTO } from "./types";

const DEFAULT_SUPABASE_URL = "https://wafeaoqxmdxemhynvbjn.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_lyYoIWqGFTZl_gNuk9zr2A_08rDJiqt";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_SUPABASE_KEY;

// Initialize Supabase if URL and anon/publishable key are present
export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 10
);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client && supabaseUrl && supabaseAnonKey) {
    try {
      client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      });
    } catch (err) {
      console.warn("Supabase client init safe catch:", err);
      client = null;
    }
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
  | { type: "ORDER_STATUS_CHANGED"; orderId: string; status: OrderRecordDTO["status"]; isCollected?: boolean }
  | { type: "ORDER_DELETED"; orderId: string }
  | { type: "ALL_ORDERS_CLEARED"; resetTimestamp: number };

export type MenuSyncEvent =
  | { type: "PRODUCT_ADDED"; product: ProductDTO }
  | { type: "PRODUCT_UPDATED"; product: ProductDTO }
  | { type: "PRODUCT_DELETED"; productId: string }
  | { type: "PRODUCT_AVAILABILITY_TOGGLED"; productId: string; isAvailable: boolean }
  | { type: "CATALOG_RESET" }
  | { type: "CATALOG_SYNC"; products: ProductDTO[] };

export type SettingsSyncData = {
  cashierName?: string;
  storeName?: string;
  storeTagline?: string;
  storeAddress?: string;
  logoUrl?: string;
  updatedAt?: string;
};

export type SettingsSyncEvent = {
  type: "SETTINGS_UPDATED";
  settings: SettingsSyncData;
};

const LOCAL_ORDERS_CHANNEL = "duval-caminos-orders-bus";
const LOCAL_MENU_CHANNEL = "duval-caminos-menu-bus";
const LOCAL_SETTINGS_CHANNEL = "duval-caminos-settings-bus";

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
      .catch((e: any) => {
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
  try {
    const sb = getSupabaseClient();
    if (sb) {
      const channel = sb
        .channel("pos-live-orders")
        .on("broadcast", { event: "*" }, (payload: any) => {
          if (payload.payload) {
            onEvent(payload.payload as OrderSyncEvent);
          }
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "Order" },
          (payload: any) => {
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
        try {
          sb.removeChannel(channel);
        } catch {}
      });
    }
  } catch (e) {
    console.warn("Supabase orders channel subscription error:", e);
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
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
  try {
    const sb = getSupabaseClient();
    if (sb) {
      const channel = sb.channel("pos-live-menu");
      channel
        .send({
          type: "broadcast",
          event: event.type,
          payload: event,
        })
        .catch((e: any) => {
          console.warn("Supabase realtime broadcast menu error", e);
        });
    }
  } catch {}
}

/** Listen to menu changes from other devices in real-time */
export function subscribeToMenu(onEvent: (event: MenuSyncEvent) => void) {
  const cleanups: (() => void)[] = [];

  // 1. Local BroadcastChannel listener
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const localChannel = new BroadcastChannel(LOCAL_MENU_CHANNEL);
      const handleMessage = (evt: MessageEvent<MenuSyncEvent>) => {
        if (evt.data && evt.data.type) {
          onEvent(evt.data);
        }
      };
      localChannel.addEventListener("message", handleMessage);
      cleanups.push(() => {
        try {
          localChannel.removeEventListener("message", handleMessage);
          localChannel.close();
        } catch {}
      });
    } catch {}
  }

  // 2. Supabase Realtime listener (cross-device)
  try {
    const sb = getSupabaseClient();
    if (sb) {
      const channel = sb
        .channel("pos-live-menu")
        .on("broadcast", { event: "*" }, (payload: any) => {
          if (payload.payload) {
            onEvent(payload.payload as MenuSyncEvent);
          }
        })
        .subscribe();

      cleanups.push(() => {
        try {
          sb.removeChannel(channel);
        } catch {}
      });
    }
  } catch (e) {
    console.warn("Supabase menu channel subscription error:", e);
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}

// ----------------------------------------------------------------------------
//  SETTINGS / CASHIER & LOGO SYNC
// ----------------------------------------------------------------------------

/** Broadcast settings change across local tabs and via Supabase to other devices */
export function broadcastSettingsEvent(event: SettingsSyncEvent) {
  // 1. Local BroadcastChannel (immediate same-device sync)
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(LOCAL_SETTINGS_CHANNEL);
      channel.postMessage(event);
      channel.close();
    } catch (e) {
      console.warn("Local broadcast settings error", e);
    }
  }

  // 2. Supabase Realtime broadcast (cross-device sync)
  try {
    const sb = getSupabaseClient();
    if (sb) {
      const channel = sb.channel("pos-live-settings");
      channel
        .send({
          type: "broadcast",
          event: event.type,
          payload: event,
        })
        .catch((e: any) => {
          console.warn("Supabase realtime broadcast settings error", e);
        });
    }
  } catch {}
}

/** Listen to settings changes from other devices in real-time */
export function subscribeToSettings(onEvent: (event: SettingsSyncEvent) => void) {
  const cleanups: (() => void)[] = [];

  // 1. Local BroadcastChannel listener
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const localChannel = new BroadcastChannel(LOCAL_SETTINGS_CHANNEL);
      const handleMessage = (evt: MessageEvent<SettingsSyncEvent>) => {
        if (evt.data && evt.data.type) {
          onEvent(evt.data);
        }
      };
      localChannel.addEventListener("message", handleMessage);
      cleanups.push(() => {
        try {
          localChannel.removeEventListener("message", handleMessage);
          localChannel.close();
        } catch {}
      });
    } catch {}
  }

  // 2. Supabase Realtime listener (cross-device)
  try {
    const sb = getSupabaseClient();
    if (sb) {
      const channel = sb
        .channel("pos-live-settings")
        .on("broadcast", { event: "*" }, (payload: any) => {
          if (payload.payload) {
            onEvent(payload.payload as SettingsSyncEvent);
          }
        })
        .subscribe();

      cleanups.push(() => {
        try {
          sb.removeChannel(channel);
        } catch {}
      });
    }
  } catch (e) {
    console.warn("Supabase settings channel subscription error:", e);
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}
