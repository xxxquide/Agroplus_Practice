import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeInventoryStatus } from "@/lib/inventory";
import { requireManagerOrAdmin, requireUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  quantity: z.coerce.number().min(0),
  unit: z.string().min(1),
  responsible: z.string().min(2),
  minThreshold: z.coerce.number().min(0)
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  responsible: z.string().min(2).optional(),
  minThreshold: z.coerce.number().min(0).optional()
});

const deleteSchema = z.object({
  id: z.string().min(1)
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.inventoryItem.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await requireManagerOrAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = createSchema.parse(json);
    const status = computeInventoryStatus(parsed.quantity, parsed.minThreshold);
    const created = await prisma.inventoryItem.create({
      data: {
        name: parsed.name,
        category: parsed.category,
        quantity: parsed.quantity,
        unit: parsed.unit,
        responsible: parsed.responsible,
        minThreshold: parsed.minThreshold,
        status
      }
    });

    await prisma.inventoryLog.create({
      data: {
        inventoryItemId: created.id,
        type: "CREATE"
      }
    });

    await createNotification({
      title: "Додано ресурс на склад",
      body: `${created.name} • ${created.quantity} ${created.unit}`,
      kind: "inventory"
    });

    return NextResponse.json({ item: created });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireManagerOrAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = updateSchema.parse(json);
    const existing = await prisma.inventoryItem.findUnique({ where: { id: parsed.id } });
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const nextQuantity = parsed.quantity ?? existing.quantity;
    const nextMin = parsed.minThreshold ?? existing.minThreshold;
    const status = computeInventoryStatus(nextQuantity, nextMin);

    const updated = await prisma.inventoryItem.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        category: parsed.category,
        quantity: parsed.quantity,
        unit: parsed.unit,
        responsible: parsed.responsible,
        minThreshold: parsed.minThreshold,
        status
      }
    });

    await prisma.inventoryLog.create({
      data: {
        inventoryItemId: updated.id,
        type: "UPDATE"
      }
    });

    await createNotification({
      title: "Оновлено ресурс",
      body: `${updated.name} • ${updated.quantity} ${updated.unit}`,
      kind: "inventory"
    });

    return NextResponse.json({ item: updated });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireManagerOrAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = deleteSchema.parse(json);
    const deleted = await prisma.inventoryItem.delete({ where: { id: parsed.id } });
    await createNotification({
      title: "Ресурс видалено",
      body: deleted.name,
      kind: "inventory"
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export const runtime = "nodejs";
