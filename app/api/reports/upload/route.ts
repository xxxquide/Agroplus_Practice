import { NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { parseReportWorkbook } from "@/lib/report-import";
import { createNotification } from "@/lib/notifications";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const category = String(formData.get("category") ?? "Звіт");
  const rawTags = String(formData.get("tags") ?? "").trim();
  const descriptionInput = String(formData.get("description") ?? "").trim();

  if (!file || typeof file === "string") {
    return NextResponse.json({ message: "File required" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ message: "Файл занадто великий" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.includes(mimeType)) {
    return NextResponse.json({ message: "Неприпустимий формат" }, { status: 400 });
  }

  const originalName = path.basename(file.name);
  const ext = path.extname(originalName) || (mimeType === "application/pdf" ? ".pdf" : ".xlsx");
  const buffer = Buffer.from(await file.arrayBuffer());
  const storedName = `${crypto.randomUUID()}${ext}`;

  let tags = rawTags && rawTags !== "демо" ? rawTags : "";
  let description = descriptionInput;
  let importSummary: { fields?: number; machinery?: number; inventory?: number } | null = null;
  let importWarnings: string[] = [];

  if (mimeType.includes("spreadsheet")) {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetNames = workbook.SheetNames ?? [];
      if (!tags && sheetNames.length) {
        tags = sheetNames.slice(0, 4).join(", ");
      }
      if (!description && sheetNames.length) {
        const firstSheet = workbook.Sheets[sheetNames[0]];
        const range = firstSheet?.["!ref"] ? XLSX.utils.decode_range(firstSheet["!ref"]) : null;
        const rows = range ? range.e.r - range.s.r + 1 : 0;
        const cols = range ? range.e.c - range.s.c + 1 : 0;
        description = `Лист "${sheetNames[0]}" • ${rows}×${cols}`;
      }

      const importResult = parseReportWorkbook(buffer);
      importWarnings = importResult.warnings;
      importSummary = {
        fields: importResult.fields.length,
        machinery: importResult.machinery.length,
        inventory: importResult.inventory.length
      };

      if (
        importResult.fields.length ||
        importResult.machinery.length ||
        importResult.inventory.length
      ) {
        await prisma.$transaction(async (tx: typeof prisma) => {
          for (const row of importResult.fields) {
            await tx.field.upsert({
              where: { code: row.code },
              update: {
                name: row.name,
                region: row.region,
                district: row.district,
                cropType: row.cropType,
                status: row.status,
                areaHa: row.areaHa,
                sowingDate: row.sowingDate,
                yieldForecastTons: row.yieldForecastTons,
                soilMoisturePct: row.soilMoisturePct,
                lastInspectionAt: row.lastInspectionAt,
                geometryGeoJSON: row.geometryGeoJSON
              },
              create: {
                code: row.code,
                name: row.name,
                region: row.region,
                district: row.district,
                cropType: row.cropType,
                status: row.status,
                areaHa: row.areaHa,
                sowingDate: row.sowingDate,
                yieldForecastTons: row.yieldForecastTons,
                soilMoisturePct: row.soilMoisturePct,
                lastInspectionAt: row.lastInspectionAt,
                geometryGeoJSON: row.geometryGeoJSON
              }
            });
          }
          for (const row of importResult.machinery) {
            await tx.machinery.upsert({
              where: { name: row.name },
              update: { type: row.type, status: row.status },
              create: { name: row.name, type: row.type, status: row.status }
            });
          }
          for (const row of importResult.inventory) {
            await tx.inventoryItem.upsert({
              where: { name: row.name },
              update: {
                category: row.category,
                quantity: row.quantity,
                unit: row.unit,
                responsible: row.responsible,
                minThreshold: row.minThreshold
              },
              create: {
                name: row.name,
                category: row.category,
                quantity: row.quantity,
                unit: row.unit,
                responsible: row.responsible,
                minThreshold: row.minThreshold,
                status: "ENOUGH"
              }
            });
          }
        });
      }
    } catch {
      // ignore parse errors and fallback to defaults below
    }
  }

  if (!tags) tags = "звіт";
  if (!description) description = "Завантажено з панелі";

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { message: "Supabase storage не налаштовано" },
      { status: 500 }
    );
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "reports";
  const storagePath = `${user.id}/${storedName}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
  if (uploadError) {
    return NextResponse.json({ message: "Не вдалося зберегти файл" }, { status: 500 });
  }

  const report = await prisma.report.create({
    data: {
      fileNameOriginal: originalName,
      fileNameStored: storagePath,
      mimeType,
      sizeBytes: file.size,
      category,
      tags,
      description,
      uploadedByUserId: user.id
    },
    include: {
      uploadedByUser: true
    }
  });

  await createNotification({
    title: "Новий звіт",
    body: `${report.fileNameOriginal} • ${report.category}`,
    kind: "REPORT"
  });

  if (importSummary && (importSummary.fields || importSummary.inventory || importSummary.machinery)) {
    await createNotification({
      title: "Імпорт з XLSX",
      body: `Поля: ${importSummary.fields ?? 0}, Склад: ${importSummary.inventory ?? 0}, Техніка: ${importSummary.machinery ?? 0}`,
      kind: "SYSTEM"
    });
  }

  return NextResponse.json({
    report: {
      id: report.id,
      fileNameOriginal: report.fileNameOriginal,
      mimeType: report.mimeType,
      uploadedAt: report.uploadedAt,
      uploadedBy: report.uploadedByUser.name,
      category: report.category
    },
    importSummary,
    importWarnings
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
