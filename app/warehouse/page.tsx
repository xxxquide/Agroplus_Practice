import { prisma } from "@/lib/db";
import { WarehouseClient } from "./_components/warehouse-client";

export default async function WarehousePage() {
  const items = await prisma.inventoryItem.findMany({ orderBy: { updatedAt: "desc" } });
  let consumeLogs: {
    id: string;
    amount: number | null;
    reason: string | null;
    createdAt: Date;
    inventoryItem: { name: string } | null;
  }[] = [];

  const inventoryLogDelegate = prisma.inventoryLog;
  if (inventoryLogDelegate?.findMany) {
    consumeLogs = await inventoryLogDelegate.findMany({
      where: { type: "CONSUME" },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { inventoryItem: true }
    });
  }

  return (
    <WarehouseClient
      initialItems={items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        responsible: item.responsible,
        status: item.status,
        minThreshold: item.minThreshold,
        updatedAt: item.updatedAt.toISOString()
      }))}
      recentConsumes={consumeLogs.map((log) => ({
        id: log.id,
        name: log.inventoryItem?.name ?? "Ресурс",
        amount: log.amount ?? 0,
        reason: log.reason ?? null,
        createdAt: log.createdAt.toISOString()
      }))}
    />
  );
}
