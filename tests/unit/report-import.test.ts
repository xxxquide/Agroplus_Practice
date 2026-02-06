import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseReportWorkbook } from "@/lib/report-import";

const makeWorkbookBuffer = () => {
  const workbook = XLSX.utils.book_new();
  const fieldsSheet = XLSX.utils.json_to_sheet([
    {
      Код: "A1",
      Назва: "Північне",
      Культура: "Пшениця",
      Район: "Вінницький",
      Площа: 120,
      "Прогноз врожаю": 65,
      Вологість: 24,
      Посів: "2025-10-01",
      Огляд: "2026-01-18",
      Широта: 49.23,
      Довгота: 28.46,
      Розмір: 0.5
    }
  ]);
  const machinerySheet = XLSX.utils.json_to_sheet([
    { Назва: "Трактор №5", Тип: "Трактор", Статус: "ACTIVE" }
  ]);
  const inventorySheet = XLSX.utils.json_to_sheet([
    {
      Name: "Дизель",
      Category: "Паливо",
      Quantity: 1000,
      Unit: "л",
      Responsible: "Олександр",
      MinThreshold: 200
    }
  ]);
  XLSX.utils.book_append_sheet(workbook, fieldsSheet, "Поля");
  XLSX.utils.book_append_sheet(workbook, machinerySheet, "Техніка");
  XLSX.utils.book_append_sheet(workbook, inventorySheet, "Склад");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

describe("parseReportWorkbook", () => {
  it("parses fields, machinery, inventory from XLSX", () => {
    const buffer = Buffer.from(makeWorkbookBuffer());
    const result = parseReportWorkbook(buffer);
    expect(result.fields).toHaveLength(1);
    expect(result.machinery).toHaveLength(1);
    expect(result.inventory).toHaveLength(1);
    expect(result.fields[0].code).toBe("A1");
    expect(result.machinery[0].status).toBe("ACTIVE");
    expect(result.inventory[0].name).toBe("Дизель");
  });
});
