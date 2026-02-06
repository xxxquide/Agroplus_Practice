import { prisma } from "@/lib/db";
import { FieldsClient } from "./_components/fields-client";

export default async function FieldsPage() {
  const fields = await prisma.field.findMany({
    orderBy: { code: "asc" },
    include: { tasks: { orderBy: { createdAt: "desc" } } }
  });
  const machinery = await prisma.machinery.findMany({ orderBy: { updatedAt: "desc" } });
  const reports = await prisma.report.findMany({
    orderBy: { uploadedAt: "desc" },
    take: 12,
    include: { uploadedByUser: true }
  });

  return (
    <FieldsClient
      initialFields={fields.map((field) => ({
        id: field.id,
        code: field.code,
        name: field.name,
        region: field.region,
        district: field.district,
        cropType: field.cropType,
        status: field.status,
        areaHa: field.areaHa,
        sowingDate: field.sowingDate?.toISOString() ?? null,
        yieldForecastTons: field.yieldForecastTons,
        soilMoisturePct: field.soilMoisturePct,
        lastInspectionAt: field.lastInspectionAt?.toISOString() ?? null,
        geometryGeoJSON: field.geometryGeoJSON,
        tasks: field.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          createdAt: task.createdAt.toISOString()
        }))
      }))}
      machinery={machinery.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status
      }))}
      reports={reports.map((report) => ({
        id: report.id,
        fileNameOriginal: report.fileNameOriginal,
        tags: report.tags,
        uploadedAt: report.uploadedAt.toISOString(),
        uploadedBy: report.uploadedByUser.name
      }))}
    />
  );
}
