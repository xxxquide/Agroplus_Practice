import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

type FieldRow = Awaited<ReturnType<typeof prisma.field.findMany>>[number];
type InventoryRow = Awaited<ReturnType<typeof prisma.inventoryItem.findMany>>[number];
type MachineryRow = Awaited<ReturnType<typeof prisma.machinery.findMany>>[number];
type ReportRow = Awaited<ReturnType<typeof prisma.report.findMany>>[number];

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [fields, inventory, machinery, reports] = await Promise.all([
    prisma.field.findMany({ orderBy: { code: "asc" } }),
    prisma.inventoryItem.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.machinery.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.report.findMany({ orderBy: { uploadedAt: "desc" } })
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      fields.map((item: FieldRow) => ({
        code: item.code,
        name: item.name,
        region: item.region,
        district: item.district,
        cropType: item.cropType,
        status: item.status,
        areaHa: item.areaHa,
        sowingDate: item.sowingDate?.toISOString() ?? "",
        yieldForecastTons: item.yieldForecastTons,
        soilMoisturePct: item.soilMoisturePct,
        lastInspectionAt: item.lastInspectionAt?.toISOString() ?? "",
        geometryGeoJSON: item.geometryGeoJSON
      }))
    ),
    "Поля"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      inventory.map((item: InventoryRow) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        responsible: item.responsible,
        status: item.status,
        minThreshold: item.minThreshold,
        updatedAt: item.updatedAt.toISOString()
      }))
    ),
    "Склад"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      machinery.map((item: MachineryRow) => ({
        name: item.name,
        type: item.type,
        status: item.status,
        updatedAt: item.updatedAt.toISOString()
      }))
    ),
    "Техніка"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      reports.map((item: ReportRow) => ({
        fileNameOriginal: item.fileNameOriginal,
        category: item.category,
        tags: item.tags,
        description: item.description ?? "",
        sizeBytes: item.sizeBytes,
        uploadedAt: item.uploadedAt.toISOString()
      }))
    ),
    "Звіти"
  );

  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"export_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx\"`
    }
  });
}

export const runtime = "nodejs";
