import { getCatalog, getOpenShift } from "@/lib/catalog";
import { PosScreen } from "@/components/pos/pos-screen";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [catalog, shift] = await Promise.all([
    getCatalog(),
    getOpenShift(),
  ]);

  return <PosScreen initialCatalog={catalog} initialShift={shift} />;
}
