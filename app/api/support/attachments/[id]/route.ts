import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const attachment = await prisma.supportAttachment.findUnique({
    where: { id }
  });
  if (!attachment) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Storage not configured" }, { status: 500 });
  }
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "reports";
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(attachment.fileNameStored);
  if (error || !data) {
    return NextResponse.json({ message: "Failed to load file" }, { status: 500 });
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${attachment.fileNameOriginal}"`
    }
  });
}

export const runtime = "nodejs";
