import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireManagerOrAdmin, requireUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

const machinerySchema = z.object({
  name: z.string().min(2),
  type: z.string().min(2),
  status: z.enum(["ACTIVE", "MAINTENANCE", "OFFLINE"])
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.machinery.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await requireManagerOrAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = machinerySchema.parse(json);
    const item = await prisma.machinery.upsert({
      where: { name: parsed.name },
      update: { type: parsed.type, status: parsed.status },
      create: { name: parsed.name, type: parsed.type, status: parsed.status }
    });
    await createNotification({
      title: "Оновлено техніку",
      body: `${item.name} • ${item.status}`,
      kind: "MACHINERY"
    });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export const runtime = "nodejs";
