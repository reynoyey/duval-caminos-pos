import type { OrderRecordDTO } from "./types";

let inMemoryOrders: OrderRecordDTO[] = [];
let deletedOrderIds: string[] = [];
let lastResetTimestamp: number = 0;

export function getInMemoryOrders(): OrderRecordDTO[] {
  return inMemoryOrders.filter((o) => !deletedOrderIds.includes(o.id));
}

export function setInMemoryOrders(orders: OrderRecordDTO[]) {
  inMemoryOrders = orders;
}

export function addInMemoryOrder(order: OrderRecordDTO) {
  deletedOrderIds = deletedOrderIds.filter((id) => id !== order.id);
  inMemoryOrders = [order, ...inMemoryOrders.filter((o) => o.id !== order.id)].slice(0, 200);
}

export function updateInMemoryOrderStatus(orderId: string, status?: string, isCollected?: boolean) {
  const nowIso = new Date().toISOString();
  inMemoryOrders = inMemoryOrders.map((o) =>
    o.id === orderId
      ? {
          ...o,
          ...(status ? { status: status as any } : {}),
          ...(isCollected !== undefined ? { isCollected } : {}),
          updatedAt: nowIso,
        }
      : o
  );
}

export function deleteInMemoryOrder(orderId: string) {
  deletedOrderIds.push(orderId);
  inMemoryOrders = inMemoryOrders.filter((o) => o.id !== orderId);
}

export function resetInMemoryOrders() {
  inMemoryOrders = [];
  deletedOrderIds = [];
  lastResetTimestamp = Date.now();
}

export function getDeletedOrderIds(): string[] {
  return deletedOrderIds;
}

export function getLastResetTimestamp(): number {
  return lastResetTimestamp;
}
