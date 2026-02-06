"use client";

import * as React from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReportItem } from "./reports-card";

export function LocalReportModal({
  open,
  onClose,
  onAdd
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (report: ReportItem) => void;
}) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("Демо");
  const [type, setType] = React.useState<"pdf" | "xlsx">("pdf");

  React.useEffect(() => {
    if (!open) {
      setName("");
      setCategory("Демо");
      setType("pdf");
    }
  }, [open]);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Вкажіть назву файлу");
      return;
    }
    const mimeType =
      type === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    onAdd({
      id: `local-${crypto.randomUUID()}`,
      fileNameOriginal: name.trim(),
      mimeType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: "Локально",
      category: category.trim() || "Демо",
      localOnly: true
    });
    toast.success("Локальний звіт додано");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Додати локальний звіт">
      <div className="space-y-4">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Назва файлу (наприклад, Звіт_лютий.pdf)"
        />
        <Input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Категорія"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={type === "pdf" ? "default" : "outline"}
            onClick={() => setType("pdf")}
          >
            PDF
          </Button>
          <Button
            type="button"
            variant={type === "xlsx" ? "default" : "outline"}
            onClick={() => setType("xlsx")}
          >
            XLSX
          </Button>
        </div>
        <Button className="w-full" onClick={handleAdd}>
          Додати
        </Button>
      </div>
    </Modal>
  );
}
