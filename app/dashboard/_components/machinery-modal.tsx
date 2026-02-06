"use client";

import * as React from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MachineryInput = {
  name: string;
  type: string;
  status: "ACTIVE" | "MAINTENANCE" | "OFFLINE";
};

export function MachineryModal({
  open,
  onClose,
  onAdd
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: MachineryInput) => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState<MachineryInput["status"]>("ACTIVE");

  React.useEffect(() => {
    if (!open) {
      setName("");
      setType("");
      setStatus("ACTIVE");
    }
  }, [open]);

  const handleAdd = () => {
    if (!name.trim() || !type.trim()) {
      toast.error("Заповніть назву і тип");
      return;
    }
    onAdd({
      name: name.trim(),
      type: type.trim(),
      status
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Додати техніку">
      <div className="space-y-4">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Назва (наприклад, Трактор №5)"
        />
        <Input
          value={type}
          onChange={(event) => setType(event.target.value)}
          placeholder="Тип (наприклад, Трактор)"
        />
        <select
          className="input-surface h-12 w-full rounded-input px-4 text-sm text-ink"
          value={status}
          onChange={(event) => setStatus(event.target.value as MachineryInput["status"])}
        >
          <option value="ACTIVE">В роботі</option>
          <option value="MAINTENANCE">На ремонті</option>
          <option value="OFFLINE">В простої</option>
        </select>
        <Button className="w-full" onClick={handleAdd}>
          Додати
        </Button>
      </div>
    </Modal>
  );
}
