import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireManagerOrAdmin, requireUser } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

const createSchema = z.object({
  fieldId: z.string().min(1),
  title: z.string().min(2)
});

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"])
});

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const fieldId = searchParams.get("fieldId");
  if (!fieldId) {
    return NextResponse.json({ message: "fieldId required" }, { status: 400 });
  }
  const tasks = await prisma.fieldTask.findMany({
    where: { fieldId },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const user = await requireManagerOrAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = createSchema.parse(json);
    const task = await prisma.fieldTask.create({
      data: {
        fieldId: parsed.fieldId,
        title: parsed.title,
        status: "OPEN"
      }
    });
    await createNotification({
      title: "Нова задача по полю",
      body: parsed.title,
      kind: "FIELD"
    });
    return NextResponse.json({ task });
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
    const task = await prisma.fieldTask.update({
      where: { id: parsed.id },
      data: { status: parsed.status }
    });
    return NextResponse.json({ task });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export const runtime = "nodejs";
