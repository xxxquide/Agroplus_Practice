import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const take = Number(searchParams.get("take") ?? 4);
  const logs = await prisma.inventoryLog.findMany({
    where: type ? { type: type as "CREATE" | "UPDATE" | "CONSUME" } : undefined,
    orderBy: { createdAt: "desc" },
    take: Number.isFinite(take) ? take : 4,
    include: { inventoryItem: true }
  });
  return NextResponse.json({
    logs: logs.map((log: typeof logs[number]) => ({
      id: log.id,
      name: log.inventoryItem?.name ?? "Ресурс",
      amount: log.amount ?? 0,
      reason: log.reason ?? null,
      createdAt: log.createdAt.toISOString()
    }))
  });
}

export const runtime = "nodejs";
