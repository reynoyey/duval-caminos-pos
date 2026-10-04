// ============================================================================
//  Duval Caminos Coffee — Type Definitions (Full English)
// ============================================================================

export type OrderType = "DINE_IN" | "TAKEAWAY";
export type OrderStatus = "PROCESSING" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "CASH" | "QRIS" | "DEBIT_EDC";
export type QrisMode = "DYNAMIC" | "STATIC";
export type DiscountType = "NONE" | "PERCENT" | "AMOUNT";

export interface ModifierOptionDTO {
  id: string;
  code: string;
  name: string;
  priceDelta: number; // in IDR
  isDefault: boolean;
}

export interface ModifierGroupDTO {
  id: string;
  code: string; // TEMPERATURE | SIZE | SWEETNESS | MILK | ADDON
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOptionDTO[];
}

export interface ProductDTO {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  basePrice: number; // in IDR
  isBeverage: boolean; // counted as beverage cup in daily metrics
  isAvailable: boolean; // in stock vs sold out toggle
  tag: string | null; // "Best Seller", "New", "Signature", etc.
  categoryId: string;
  categoryName: string;
  modifierGroups: ModifierGroupDTO[];
  createdAt?: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  icon: string | null; // Lucide icon identifier
}

export interface CatalogDTO {
  categories: CategoryDTO[];
  products: ProductDTO[];
}

export interface ShiftDTO {
  id: string;
  cashierName: string;
  openedAt: string;
  openingCash: number;
  status: "OPEN" | "CLOSED";
}

export interface DiscountInput {
  type: DiscountType;
  value: number; // percentage (0-100) or fixed amount
  code?: string | null;
  label?: string | null;
}

export interface OrderItemModifierDTO {
  id?: string;
  groupCode: string;
  groupName: string;
  optionCode: string;
  optionName: string;
  priceDelta: number;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  productName: string;
  categoryName: string;
  isBeverage: boolean;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  note: string | null;
  modifiers: OrderItemModifierDTO[];
}

export interface OrderPaymentDTO {
  id?: string;
  method: PaymentMethod;
  amount: number;
  tendered: number;
  change: number;
  qrisMode?: QrisMode | null;
  reference?: string | null;
  paidAt?: string;
}

export interface OrderRecordDTO {
  id: string;
  orderNumber: string; // e.g. "DCC-261003-0001"
  queueNumber: number; // daily running ticket number
  orderType: OrderType;
  customerName: string;
  tableNumber: string | null;
  status: OrderStatus;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountCode: string | null;
  discountAmount: number;
  taxRate: number; // 10% PB1
  taxAmount: number;
  total: number;
  shiftId: string;
  cashierName?: string;
  createdAt: string;
  updatedAt?: string;
  items: OrderItemDTO[];
  payment: OrderPaymentDTO;
  payments?: OrderPaymentDTO[];
  isCollected?: boolean;
  collectedAt?: string;
}

/** Payload for POST /api/orders */
export interface CreateOrderPayload {
  shiftId: string;
  orderType: OrderType;
  customerName: string;
  tableNumber?: string | null;
  discount: DiscountInput;
  items: {
    productId: string;
    quantity: number;
    optionIds: string[];
    note?: string | null;
  }[];
  payment: {
    method: PaymentMethod;
    tendered: number;
    qrisMode?: QrisMode | null;
    reference?: string | null;
  };
}

export interface CreatedOrderResponse {
  success: boolean;
  order: OrderRecordDTO;
}

/** Product Management Payloads */
export interface CreateProductPayload {
  name: string;
  categoryId: string;
  basePrice: number;
  description?: string;
  isBeverage?: boolean;
  tag?: string;
  isAvailable?: boolean;
  modifierGroupCodes?: string[];
}

export interface UpdateProductPayload {
  id: string;
  name?: string;
  categoryId?: string;
  basePrice?: number;
  description?: string;
  isBeverage?: boolean;
  tag?: string;
  isAvailable?: boolean;
}
