"use client";

import * as React from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportItem } from "./reports-card";

export function UploadReportModal({
  open,
  onClose,
  onUploaded
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (report: ReportItem) => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [category, setCategory] = React.useState("Звіт");
  const [tags, setTags] = React.useState("демо");
  const [description, setDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open]);

  const reset = () => {
    setFile(null);
    setCategory("Звіт");
    setTags("демо");
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Оберіть файл");
      return;
    }
    if (
      ![
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ].includes(file.type)
    ) {
      toast.error("Дозволені тільки PDF або XLSX");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("tags", tags);
    formData.append("description", description);

    setLoading(true);
    try {
      const response = await fetch("/api/reports/upload", {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message?.message ?? "Upload failed");
      }
      const data = await response.json();
      onUploaded({
        id: data.report.id,
        fileNameOriginal: data.report.fileNameOriginal,
        mimeType: data.report.mimeType,
        uploadedAt: data.report.uploadedAt,
        uploadedBy: data.report.uploadedBy,
        category: data.report.category,
        downloadUrl: `/api/reports/${data.report.id}/file`,
        previewUrl: data.report.mimeType.includes("pdf")
          ? `/api/reports/${data.report.id}/file?inline=1`
          : undefined
      });
      toast.success("Звіт завантажено");
      reset();
      onClose();
    } catch {
      toast.error("Не вдалося завантажити звіт");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Завантажити звіт">
      <div className="space-y-4">
        <Input
          type="file"
          accept=".pdf,.xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Категорія"
        />
        <Input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="Теги"
        />
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Опис"
        />
        <Button className="w-full" onClick={handleSubmit} disabled={loading}>
          {loading ? "Завантаження..." : "Завантажити"}
        </Button>
      </div>
    </Modal>
  );
}
