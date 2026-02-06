import { prisma } from "@/lib/db";
import type { NotificationKind } from "@prisma/client";

export async function createNotification({
  title,
  body,
  kind,
  userId
}: {
  title: string;
  body?: string | null;
  kind: NotificationKind | string;
  userId?: string | null;
}) {
  try {
    await prisma.notification.create({
      data: {
        title,
        body: body ?? null,
        kind: (typeof kind === "string" ? kind.toUpperCase() : kind) as NotificationKind,
        userId: userId ?? null
      }
    });
  } catch {
    // ignore notification errors
  }
}
