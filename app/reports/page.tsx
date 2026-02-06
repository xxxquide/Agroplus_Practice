import { prisma } from "@/lib/db";
import { ReportsClient } from "./_components/reports-client";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { uploadedAt: "desc" },
    include: { uploadedByUser: true }
  });

  return (
    <ReportsClient
      initialReports={reports.map((report) => ({
        id: report.id,
        fileNameOriginal: report.fileNameOriginal,
        mimeType: report.mimeType,
        uploadedAt: report.uploadedAt.toISOString(),
        uploadedBy: report.uploadedByUser.name,
        category: report.category,
        tags: report.tags,
        description: report.description,
        sizeBytes: report.sizeBytes,
        downloadUrl: `/api/reports/${report.id}/file`,
        previewUrl: report.mimeType.includes("pdf")
          ? `/api/reports/${report.id}/file?inline=1`
          : undefined
      }))}
    />
  );
}
