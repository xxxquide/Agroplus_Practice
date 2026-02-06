import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeInventoryStatus } from "@/lib/inventory";
import { requireManagerOrAdmin } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

const consumeSchema = z.object({
  id: z.string().min(1),
  amount: z.coerce.number().positive(),
  reason: z.string().min(2).optional()
});

export async function POST(request: Request) {
  const user = await requireManagerOrAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = consumeSchema.parse(json);
    const item = await prisma.inventoryItem.findUnique({ where: { id: parsed.id } });
    if (!item) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (item.quantity - parsed.amount < 0) {
      return NextResponse.json({ message: "Insufficient quantity" }, { status: 400 });
    }

    const nextQuantity = item.quantity - parsed.amount;
    const status = computeInventoryStatus(nextQuantity, item.minThreshold);
    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: nextQuantity,
        status
      }
    });

    await prisma.inventoryLog.create({
      data: {
        inventoryItemId: item.id,
        type: "CONSUME",
        amount: parsed.amount,
        reason: parsed.reason
      }
    });

    await createNotification({
      title: "Списання ресурсу",
      body: `${item.name} • -${parsed.amount} ${item.unit}`,
      kind: "inventory"
    });

    return NextResponse.json({ item: updated });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export const runtime = "nodejs";
