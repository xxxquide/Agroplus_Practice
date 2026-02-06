import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ logs: [] });
  }

  const logs = await prisma.inventoryLog.findMany({
    where: { inventoryItemId: itemId },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({ logs });
}

export const runtime = "nodejs";
