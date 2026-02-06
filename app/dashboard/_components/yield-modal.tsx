"use client";

import * as React from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type YieldPoint = {
  name: string;
  value: number;
};

export function YieldModal({
  open,
  onClose,
  onAdd
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: YieldPoint) => void;
}) {
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setName("");
      setValue("");
    }
  }, [open]);

  const handleAdd = () => {
    const numeric = Number(value);
    if (!name.trim() || !Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Заповніть культуру та значення");
      return;
    }
    onAdd({ name: name.trim(), value: numeric });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Додати прогноз">
      <div className="space-y-4">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Культура (наприклад, Соя)"
        />
        <Input
          type="number"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Тонни"
        />
        <Button className="w-full" onClick={handleAdd}>
          Додати
        </Button>
      </div>
    </Modal>
  );
}
