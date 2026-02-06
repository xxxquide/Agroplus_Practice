import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireManagerOrAdmin, requireUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

const yieldSchema = z.object({
  cropType: z.string().min(1),
  value: z.coerce.number().positive()
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.yieldForecast.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await requireManagerOrAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = yieldSchema.parse(json);
    const item = await prisma.yieldForecast.create({
      data: {
        cropType: parsed.cropType,
        value: parsed.value
      }
    });
    await createNotification({
      title: "Оновлено прогноз врожаю",
      body: `${item.cropType} • ${item.value} т`,
      kind: "FIELD"
    });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export const runtime = "nodejs";
