import { NextResponse } from "next/server";
import crypto from "crypto";
import type { SupportPriority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: { attachments: true }
  });
  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const subject = String(formData.get("subject") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "MEDIUM").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!subject || !category || !message) {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }

  const priority =
    (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priorityRaw)
      ? priorityRaw
      : "MEDIUM") as SupportPriority;

  const ticket = await prisma.supportTicket.create({
    data: {
      subject,
      category,
      priority,
      status: "OPEN",
      message,
      createdByUserId: user.id
    }
  });

  const file = formData.get("attachment");
  if (file && typeof file !== "string") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;
    const mimeType = file.type || "application/octet-stream";
    const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
    const storedName = `${ticket.id}/${crypto.randomUUID()}.${ext}`;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "reports";
      const { error } = await supabase.storage
        .from(bucket)
        .upload(`support/${storedName}`, buffer, { contentType: mimeType, upsert: false });
      if (!error) {
        await prisma.supportAttachment.create({
          data: {
            ticketId: ticket.id,
            fileNameOriginal: originalName,
            fileNameStored: `support/${storedName}`,
            mimeType,
            sizeBytes: buffer.length
          }
        });
      }
    }
  }

  await createNotification({
    title: "Нове звернення в підтримку",
    body: `${ticket.subject} • ${ticket.category}`,
    kind: "SUPPORT"
  });

  return NextResponse.json({ ticket });
}

export const runtime = "nodejs";
