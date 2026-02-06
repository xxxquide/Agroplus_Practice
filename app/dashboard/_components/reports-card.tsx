"use client";

import * as React from "react";
import { FileSpreadsheet, FileText, Download, Eye } from "lucide-react";
import { GlassCard } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/format";

export type ReportItem = {
  id: string;
  fileNameOriginal: string;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  category: string;
  downloadUrl?: string;
  previewUrl?: string;
  localOnly?: boolean;
};

function FileIcon({ mime }: { mime: string }) {
  return mime.includes("pdf") ? (
    <FileText className="h-5 w-5 text-[#d97706]" />
  ) : (
    <FileSpreadsheet className="h-5 w-5 text-[#0f766e]" />
  );
}

export function ReportsCard({
  reports,
  onUploadClick,
  actions,
  page,
  pageCount,
  onPageChange
}: {
  reports: ReportItem[];
  onUploadClick: () => void;
  actions?: React.ReactNode;
  page?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}) {
  const [preview, setPreview] = React.useState<ReportItem | null>(null);
  const pages = pageCount ? Array.from({ length: pageCount }, (_, idx) => idx + 1) : [];

  return (
    <GlassCard className="flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {pageCount && pageCount > 1 ? (
            <div className="flex items-center gap-1 rounded-full bg-white/60 px-2 py-1">
              {pages.map((value) => (
                <button
                  key={value}
                  onClick={() => onPageChange?.(value)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition ${
                    value === page
                      ? "bg-brand text-white shadow-sm"
                      : "text-ink/60 hover:bg-white/80 hover:text-ink"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}
          <h3 className="text-sm font-semibold">Останні звіти</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={onUploadClick}>
            Завантажити звіт
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {reports.length === 0 ? (
          <div className="rounded-xl bg-white/60 px-4 py-6 text-center text-sm text-ink/60">
            Звіти ще не завантажено.
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-white/60 px-4 py-3"
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <FileIcon mime={report.mimeType} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{report.fileNameOriginal}</p>
                  <p className="text-xs text-ink/50">
                    {report.category} • {report.uploadedBy}
                  </p>
                  <p className="text-xs text-ink/50">
                    {formatDateTime(report.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreview(report)}
                  disabled={!report.previewUrl}
                  className="whitespace-nowrap"
                >
                  <Eye size={14} /> Переглянути
                </Button>
                {report.downloadUrl ? (
                  <a
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-ink/80 transition hover:bg-white"
                    href={report.downloadUrl}
                  >
                    <Download size={14} /> Завантажити
                  </a>
                ) : (
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/40 px-3 py-1 text-xs font-medium text-ink/40"
                    disabled
                  >
                    <Download size={14} /> Локальний
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.fileNameOriginal}
        className="max-w-3xl"
      >
        {preview?.previewUrl ? (
          <iframe className="h-[70vh] w-full rounded-xl" src={preview.previewUrl} />
        ) : (
          <p className="text-sm text-ink/60">Перегляд доступний лише для PDF.</p>
        )}
      </Modal>
    </GlassCard>
  );
}
