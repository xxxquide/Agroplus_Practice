import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireManagerOrAdmin } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

const fieldSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  cropType: z.string().min(1),
  status: z.enum(["ACTIVE", "DORMANT", "HARVEST"]),
  district: z.string().min(1),
  sowingDate: z.string().nullable().optional(),
  lastInspectionAt: z.string().nullable().optional(),
  areaHa: z.number().positive(),
  yieldForecastTons: z.number().positive(),
  soilMoisturePct: z.number().min(0).max(100),
  geometryGeoJSON: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await requireManagerOrAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = fieldSchema.parse(json);
    const geometry = JSON.parse(parsed.geometryGeoJSON);
    if (geometry.type !== "Polygon") {
      return NextResponse.json({ message: "Invalid geometry" }, { status: 400 });
    }

    const created = await prisma.field.create({
      data: {
        code: parsed.code,
        name: parsed.name,
        region: "Вінницька",
        district: parsed.district,
        cropType: parsed.cropType,
        status: parsed.status,
        areaHa: parsed.areaHa,
        sowingDate: parsed.sowingDate ? new Date(parsed.sowingDate) : null,
        yieldForecastTons: parsed.yieldForecastTons,
        soilMoisturePct: parsed.soilMoisturePct,
        lastInspectionAt: parsed.lastInspectionAt ? new Date(parsed.lastInspectionAt) : null,
        geometryGeoJSON: parsed.geometryGeoJSON
      }
    });

    await createNotification({
      title: "Додано нове поле",
      body: `${created.code} • ${created.cropType}`,
      kind: "field"
    });

    return NextResponse.json({
      field: {
        id: created.id,
        code: created.code,
        name: created.name,
        region: created.region,
        district: created.district,
        cropType: created.cropType,
        status: created.status,
        areaHa: created.areaHa,
        sowingDate: created.sowingDate?.toISOString() ?? null,
        yieldForecastTons: created.yieldForecastTons,
        soilMoisturePct: created.soilMoisturePct,
        lastInspectionAt: created.lastInspectionAt?.toISOString() ?? null,
        geometryGeoJSON: created.geometryGeoJSON,
        tasks: []
      }
    });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireManagerOrAdmin();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = z.object({ id: z.string().min(1) }).parse(json);
    const deleted = await prisma.field.delete({ where: { id: parsed.id } });
    await createNotification({
      title: "Поле видалено",
      body: `${deleted.code} • ${deleted.cropType}`,
      kind: "field"
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export const runtime = "nodejs";
