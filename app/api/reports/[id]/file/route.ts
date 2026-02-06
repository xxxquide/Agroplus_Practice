import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "uploads", report.fileNameStored);
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "reports";
      const { data, error } = await supabase.storage.from(bucket).download(report.fileNameStored);
      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        const url = new URL(request.url);
        const inline = url.searchParams.get("inline") === "1";
        return new NextResponse(Buffer.from(arrayBuffer), {
          headers: {
            "Content-Type": report.mimeType,
            "Content-Disposition": `${inline ? "inline" : "attachment"}; filename=\"${report.fileNameOriginal}\"`
          }
        });
      }
    }

    const file = await fs.readFile(filePath);
    const url = new URL(request.url);
    const inline = url.searchParams.get("inline") === "1";
    return new NextResponse(file, {
      headers: {
        "Content-Type": report.mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename=\"${report.fileNameOriginal}\"`
      }
    });
  } catch {
    return NextResponse.json({ message: "File missing" }, { status: 404 });
  }
}

export const runtime = "nodejs";
