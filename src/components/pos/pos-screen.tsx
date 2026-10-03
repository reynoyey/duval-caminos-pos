"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CatalogDTO, OrderRecordDTO, ProductDTO, ShiftDTO } from "@/lib/types";
import { useCartStore, type CartLine } from "@/stores/cart-store";
import { useModifierStore } from "@/stores/modifier-store";
import { useMenuStore } from "@/stores/menu-store";
import { TopBar, type PosTab } from "./top-bar";
import { OrderHeader } from "./order-header";
import { MenuCatalog } from "./menu-catalog";
import { CartPanel } from "./cart-panel";
import { ModifierDialog } from "./modifier-dialog";
import { DiscountDialog } from "./discount-dialog";
import { CheckoutDialog } from "./checkout-dialog";
import { ReceiptDialog } from "./receipt-dialog";
import { LiveOrdersBoard } from "./live-orders-board";
import { MenuManager } from "./menu-manager";
import { ShiftReportsView } from "./shift-reports-view";
import { SettingsDialog } from "./settings-dialog";
import { useSettingsStore } from "@/stores/settings-store";

interface Props {
  initialCatalog: CatalogDTO;
  initialShift: ShiftDTO | null;
}

export function PosScreen({ initialCatalog, initialShift }: Props) {
  const [activeTab, setActiveTab] = useState<PosTab>("REGISTER");
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<OrderRecordDTO | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [nameInvalid, setNameInvalid] = useState(false);

  const cashierName = useSettingsStore((s) => s.cashierName);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Zustand stores
  const customerName = useCartStore((s) => s.customerName);
  const lines = useCartStore((s) => s.lines);
  const addLine = useCartStore((s) => s.addLine);
  const openModifier = useModifierStore((s) => s.openForProduct);
  const editModifier = useModifierStore((s) => s.openForEdit);
  const hydrateCatalog = useMenuStore((s) => s.hydrateCatalog);
  const products = useMenuStore((s) => s.products);

  // Manual rehydration to avoid SSR mismatch
  useEffect(() => {
    useCartStore.persist.rehydrate();
    if (initialCatalog && initialCatalog.products.length > 0) {
      hydrateCatalog(initialCatalog);
    }
  }, [initialCatalog, hydrateCatalog]);

  // Handle product click
  const handleProductPick = (product: ProductDTO) => {
    if (!product.isAvailable) {
      toast.error(`${product.name} is currently sold out`);
      return;
    }

    // If product has no modifiers, add directly to cart (e.g. pastries)
    if (!product.modifierGroups || product.modifierGroups.length === 0) {
      addLine({
        product,
        modifiers: [],
        quantity: 1,
      });
      toast.success(`Added ${product.name}`);
      return;
    }

    // Open zero-friction modifier customization dialog
    openModifier(product);
  };

  // Handle edit cart line
  const handleEditLine = (line: CartLine) => {
    const fullProduct = products.find((p) => p.id === line.productId);
    if (!fullProduct || !fullProduct.modifierGroups || fullProduct.modifierGroups.length === 0) {
      return;
    }
    editModifier(fullProduct, line);
  };

  // Open checkout with validation
  const handleCheckoutClick = () => {
    if (lines.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!customerName.trim()) {
      setNameInvalid(true);
      nameInputRef.current?.focus();
      toast.error("Customer name is required for barista ticket");
      setTimeout(() => setNameInvalid(false), 800);
      return;
    }

    setIsCheckoutOpen(true);
  };

  const handleOrderSettled = (order: OrderRecordDTO) => {
    setReceiptOrder(order);
    setIsReceiptOpen(true);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0B0E17] text-white font-sans antialiased selection:bg-rose-500 selection:text-white">
      {/* Top Navigation Bar */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cashierName={cashierName || initialShift?.cashierName || "Alex Rivera"}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Tab Content Area */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {/* TAB 1: POS Cashier Register */}
        {activeTab === "REGISTER" && (
          <div className="flex h-full w-full gap-3 p-3 lg:p-4 overflow-hidden">
            {/* Left Screen: Order Header & Menu Catalog (65% width) */}
            <div className="flex flex-col gap-3 min-w-0 min-h-0 overflow-hidden w-full lg:w-[65%]">
              <OrderHeader nameRef={nameInputRef} nameInvalid={nameInvalid} />
              <MenuCatalog
                catalog={initialCatalog}
                onPick={handleProductPick}
                onOpenMenuManager={() => setActiveTab("MENU_MANAGER")}
              />
            </div>

            {/* Right Screen: Sticky Cart Panel */}
            <CartPanel
              onEditLine={handleEditLine}
              onOpenDiscount={() => setIsDiscountOpen(true)}
              onCheckout={handleCheckoutClick}
            />
          </div>
        )}

        {/* TAB 2: Live Orders Queue & Kitchen Display (Processing / Completed) */}
        {activeTab === "ORDERS_QUEUE" && (
          <LiveOrdersBoard
            onViewReceipt={(order) => {
              setReceiptOrder(order);
              setIsReceiptOpen(true);
            }}
          />
        )}

        {/* TAB 3: Menu Catalog Manager (Add / Edit / Delete Menu Items) */}
        {activeTab === "MENU_MANAGER" && <MenuManager />}

        {/* TAB 4: Shift Reports & Excel Export */}
        {activeTab === "REPORTS" && <ShiftReportsView />}
      </main>

      {/* Modals & Dialogs */}
      <ModifierDialog />
      <DiscountDialog open={isDiscountOpen} onOpenChange={setIsDiscountOpen} />
      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        shiftId={initialShift?.id || "shift-live-01"}
        cashierName={cashierName || initialShift?.cashierName || "Alex Rivera"}
        onOrderSettled={handleOrderSettled}
      />
      <ReceiptDialog
        order={receiptOrder}
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
      />
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}
