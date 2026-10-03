/* eslint-disable no-console */
import { PrismaClient, SelectionType } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
//  Modifier groups (shared across products)
// ---------------------------------------------------------------------------
const MODIFIER_GROUPS = [
  {
    code: "TEMPERATURE",
    name: "Suhu",
    selectionType: SelectionType.SINGLE,
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 1,
    options: [
      { code: "TEMP_HOT", name: "Hot", priceDelta: 0, isDefault: false },
      { code: "TEMP_ICED", name: "Iced", priceDelta: 0, isDefault: false },
    ],
  },
  {
    code: "SIZE",
    name: "Ukuran",
    selectionType: SelectionType.SINGLE,
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 2,
    options: [
      { code: "SIZE_REGULAR", name: "Regular", priceDelta: 0, isDefault: true },
      { code: "SIZE_LARGE", name: "Large", priceDelta: 6000, isDefault: false },
    ],
  },
  {
    code: "SWEETNESS",
    name: "Sweetness",
    selectionType: SelectionType.SINGLE,
    isRequired: false,
    minSelect: 0,
    maxSelect: 1,
    sortOrder: 3,
    options: [
      { code: "SWEET_100", name: "Normal (100%)", priceDelta: 0, isDefault: true },
      { code: "SWEET_50", name: "Less Sugar (50%)", priceDelta: 0, isDefault: false },
      { code: "SWEET_0", name: "No Sugar (0%)", priceDelta: 0, isDefault: false },
    ],
  },
  {
    code: "MILK",
    name: "Pilihan Susu",
    selectionType: SelectionType.SINGLE,
    isRequired: false,
    minSelect: 0,
    maxSelect: 1,
    sortOrder: 4,
    options: [
      { code: "MILK_FRESH", name: "Fresh Milk", priceDelta: 0, isDefault: true },
      { code: "MILK_OAT", name: "Oat Milk", priceDelta: 10000, isDefault: false },
      { code: "MILK_ALMOND", name: "Almond Milk", priceDelta: 12000, isDefault: false },
    ],
  },
  {
    code: "ADDON",
    name: "Add-ons",
    selectionType: SelectionType.MULTIPLE,
    isRequired: false,
    minSelect: 0,
    maxSelect: 2,
    sortOrder: 5,
    options: [
      { code: "ADDON_EXTRA_SHOT", name: "Extra Espresso Shot", priceDelta: 5000, isDefault: false },
      { code: "ADDON_SYRUP", name: "Flavor Syrup", priceDelta: 5000, isDefault: false },
    ],
  },
] as const;

type GroupCode = (typeof MODIFIER_GROUPS)[number]["code"];

const MILK_DRINK: GroupCode[] = ["TEMPERATURE", "SIZE", "SWEETNESS", "MILK", "ADDON"];
const BLACK_DRINK: GroupCode[] = ["TEMPERATURE", "SIZE", "SWEETNESS", "ADDON"];
const BREW: GroupCode[] = ["TEMPERATURE", "SIZE"];
const TEA: GroupCode[] = ["TEMPERATURE", "SIZE", "SWEETNESS"];

// ---------------------------------------------------------------------------
//  Catalog
// ---------------------------------------------------------------------------
const CATALOG: {
  slug: string;
  name: string;
  icon: string;
  products: {
    sku: string;
    name: string;
    description: string;
    basePrice: number;
    groups: GroupCode[];
    isBeverage?: boolean;
    tag?: string;
  }[];
}[] = [
  {
    slug: "signature",
    name: "Signature Coffee",
    icon: "Sparkles",
    products: [
      { sku: "SIG-001", name: "Caminos Aren Latte", description: "Espresso, susu segar & gula aren Jawa", basePrice: 32000, groups: MILK_DRINK, tag: "Best Seller" },
      { sku: "SIG-002", name: "Creamy Duval", description: "Double ristretto, sweet cream & vanilla bean", basePrice: 35000, groups: MILK_DRINK, tag: "Signature" },
      { sku: "SIG-003", name: "Sea Salt Caramel Latte", description: "Karamel house-made dengan sea-salt foam", basePrice: 36000, groups: MILK_DRINK },
      { sku: "SIG-004", name: "Pandan Coconut Latte", description: "Pandan wangi, santan ringan & espresso", basePrice: 34000, groups: MILK_DRINK, tag: "New" },
      { sku: "SIG-005", name: "Butterscotch Cloud", description: "Butterscotch, cold foam & cinnamon dust", basePrice: 36000, groups: MILK_DRINK },
    ],
  },
  {
    slug: "espresso",
    name: "Espresso Based",
    icon: "Coffee",
    products: [
      { sku: "ESP-001", name: "Americano", description: "Double shot espresso & air", basePrice: 25000, groups: BLACK_DRINK },
      { sku: "ESP-002", name: "Café Latte", description: "Espresso & steamed milk lembut", basePrice: 30000, groups: MILK_DRINK },
      { sku: "ESP-003", name: "Cappuccino", description: "Espresso, susu & foam tebal", basePrice: 30000, groups: MILK_DRINK },
      { sku: "ESP-004", name: "Flat White", description: "Ristretto ganda, microfoam tipis", basePrice: 32000, groups: MILK_DRINK },
      { sku: "ESP-005", name: "Caffè Mocha", description: "Espresso, dark chocolate & susu", basePrice: 34000, groups: MILK_DRINK },
      { sku: "ESP-006", name: "Espresso", description: "Double shot house blend", basePrice: 22000, groups: ["ADDON"] },
    ],
  },
  {
    slug: "manual-brew",
    name: "Manual Brew",
    icon: "FlaskConical",
    products: [
      { sku: "MBR-001", name: "V60 Pour Over", description: "Single origin, clean & bright", basePrice: 38000, groups: BREW },
      { sku: "MBR-002", name: "Aeropress", description: "Body tebal, rasa manis natural", basePrice: 38000, groups: BREW },
      { sku: "MBR-003", name: "Japanese Iced Coffee", description: "Flash-brew langsung di atas es", basePrice: 40000, groups: ["SIZE"] },
    ],
  },
  {
    slug: "non-coffee",
    name: "Non-Coffee",
    icon: "Leaf",
    products: [
      { sku: "NCF-001", name: "Uji Matcha Latte", description: "Matcha ceremonial grade & susu", basePrice: 34000, groups: MILK_DRINK },
      { sku: "NCF-002", name: "Dark Chocolate", description: "Cokelat 70% Belgia & susu", basePrice: 32000, groups: MILK_DRINK },
      { sku: "NCF-003", name: "Earl Grey Artisan Tea", description: "Bergamot, kelopak cornflower", basePrice: 26000, groups: TEA },
      { sku: "NCF-004", name: "Lychee Rose Tea", description: "Teh hitam, leci & mawar", basePrice: 28000, groups: TEA },
    ],
  },
  {
    slug: "pastry",
    name: "Pastry & Bites",
    icon: "Croissant",
    products: [
      { sku: "PST-001", name: "Butter Croissant", description: "Laminated butter, renyah", basePrice: 28000, groups: [], isBeverage: false, tag: "Best Seller" },
      { sku: "PST-002", name: "Almond Croissant", description: "Frangipane & almond slice", basePrice: 34000, groups: [], isBeverage: false },
      { sku: "PST-003", name: "Choco Chunk Cookie", description: "Dark chocolate & sea salt", basePrice: 22000, groups: [], isBeverage: false },
      { sku: "PST-004", name: "Cheese Toast", description: "Sourdough, mozzarella & cheddar", basePrice: 30000, groups: [], isBeverage: false },
      { sku: "PST-005", name: "Banana Bread", description: "Pisang raja & walnut", basePrice: 26000, groups: [], isBeverage: false },
    ],
  },
];

async function main() {
  console.log("☕ Seeding Duval Caminos Coffee catalog…");

  // Modifier groups + options (idempotent upsert)
  const groupIdByCode = new Map<string, string>();
  for (const g of MODIFIER_GROUPS) {
    const { options, ...data } = g;
    const group = await prisma.modifierGroup.upsert({
      where: { code: g.code },
      update: data,
      create: data,
    });
    groupIdByCode.set(g.code, group.id);

    for (const [i, o] of options.entries()) {
      await prisma.modifierOption.upsert({
        where: { code: o.code },
        update: { ...o, sortOrder: i, groupId: group.id },
        create: { ...o, sortOrder: i, groupId: group.id },
      });
    }
  }

  // Categories + products
  for (const [ci, c] of CATALOG.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, sortOrder: ci },
      create: { slug: c.slug, name: c.name, icon: c.icon, sortOrder: ci },
    });

    for (const [pi, p] of c.products.entries()) {
      const { groups, ...data } = p;
      const product = await prisma.product.upsert({
        where: { sku: p.sku },
        update: { ...data, sortOrder: pi, categoryId: category.id },
        create: { ...data, sortOrder: pi, categoryId: category.id },
      });

      await prisma.productModifierGroup.deleteMany({ where: { productId: product.id } });
      if (groups.length) {
        await prisma.productModifierGroup.createMany({
          data: groups.map((code, gi) => ({
            productId: product.id,
            groupId: groupIdByCode.get(code)!,
            sortOrder: gi,
          })),
        });
      }
    }
  }

  console.log("✅ Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
