import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { OrderRecordDTO } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client && supabaseUrl && supabaseAnonKey) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
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
//  2. Supabase Realtime WebSockets (cross-device: Cashier tablet <-> Kitchen TV)
// ============================================================================

export type OrderSyncEvent =
  | { type: "ORDER_CREATED"; order: OrderRecordDTO }
  | { type: "ORDER_STATUS_CHANGED"; orderId: string; status: OrderRecordDTO["status"] }
  | { type: "ORDER_DELETED"; orderId: string };

const LOCAL_CHANNEL_NAME = "duval-caminos-orders-bus";

/** Broadcast event to other tabs/windows locally and via Supabase */
export function broadcastOrderEvent(event: OrderSyncEvent) {
  // 1. Local BroadcastChannel (immediate)
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
      channel.postMessage(event);
      channel.close();
    } catch (e) {
      console.warn("Local broadcast channel error", e);
    }
  }

  // 2. Supabase Realtime broadcast (if configured)
  const sb = getSupabaseClient();
  if (sb) {
    const channel = sb.channel("pos-live-orders");
    channel.send({
      type: "broadcast",
      event: event.type,
      payload: event,
    }).catch((e) => {
      console.warn("Supabase realtime broadcast error", e);
    });
  }
}

/** Listen to order events from both Supabase and Local BroadcastChannel */
export function subscribeToOrders(onEvent: (event: OrderSyncEvent) => void) {
  const cleanups: (() => void)[] = [];

  // 1. Local BroadcastChannel listener
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const localChannel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
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

  // 2. Supabase Realtime listener (if configured)
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
