import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const notifications = await prisma.notification.findMany({
    where: {
      OR: [{ userId: null }, { userId: user.id }]
    },
    orderBy: { createdAt: "desc" },
    take: 30
  });
  const unreadCount = notifications.filter((item: typeof notifications[number]) => !item.readAt).length;
  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  if (body?.action === "read-all") {
    await prisma.notification.updateMany({
      where: {
        readAt: null,
        OR: [{ userId: null }, { userId: user.id }]
      },
      data: { readAt: new Date() }
    });
  }
  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";
