import * as XLSX from "xlsx";
import type { FieldStatus, MachineryStatus } from "@prisma/client";

type FieldRow = {
  code: string;
  name: string;
  region: string;
  district: string;
  cropType: string;
  status: FieldStatus;
  areaHa: number;
  sowingDate: Date | null;
  yieldForecastTons: number;
  soilMoisturePct: number;
  lastInspectionAt: Date | null;
  geometryGeoJSON: string;
};

type MachineryRow = {
  name: string;
  type: string;
  status: MachineryStatus;
};

type InventoryRow = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  responsible: string;
  minThreshold: number;
};

type ImportResult = {
  fields: FieldRow[];
  machinery: MachineryRow[];
  inventory: InventoryRow[];
  warnings: string[];
};

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_]+/gu, "");

const parseDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return Number.isNaN(dateInfo.getTime()) ? null : dateInfo;
  }
  const str = String(value ?? "").trim();
  if (!str) return null;
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNumber = (value: unknown) => {
  const num = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(num) ? num : null;
};

const toStatus = (value: unknown): FieldStatus => {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("harvest") || raw.includes("збір") || raw.includes("урож")) return "HARVEST";
  if (raw.includes("dormant") || raw.includes("спокій") || raw.includes("пауза")) return "DORMANT";
  return "ACTIVE";
};

const toMachineryStatus = (value: unknown): MachineryStatus => {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("maint") || raw.includes("ремонт")) return "MAINTENANCE";
  if (raw.includes("offline") || raw.includes("простої")) return "OFFLINE";
  return "ACTIVE";
};

const normalizeGeoJSON = (value: unknown) => {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.type === "Polygon" || parsed.type === "MultiPolygon") {
      return JSON.stringify(parsed);
    }
  } catch {
    return null;
  }
  return null;
};

const rectFromCenter = (lat: number, lng: number, sizeKm: number) => {
  const size = Math.max(0.1, sizeKm);
  const deltaLat = size / 111;
  const deltaLng = size / 111;
  const coords = [
    [lng - deltaLng, lat - deltaLat],
    [lng + deltaLng, lat - deltaLat],
    [lng + deltaLng, lat + deltaLat],
    [lng - deltaLng, lat + deltaLat],
    [lng - deltaLng, lat - deltaLat]
  ];
  return JSON.stringify({ type: "Polygon", coordinates: [coords] });
};

const headerAliases = {
  code: ["код", "code", "field", "поле"],
  name: ["назва", "name", "название"],
  region: ["область", "region", "регіон"],
  district: ["район", "district"],
  cropType: ["культура", "crop", "croptype", "crop_type"],
  status: ["статус", "status"],
  areaHa: ["площа", "area", "area_ha", "га"],
  sowingDate: ["посів", "sowing", "sowing_date", "посев"],
  yieldForecastTons: ["прогнозврожаю", "yield", "yield_forecast", "урожай"],
  soilMoisturePct: ["вологість", "soil", "soilmoisture", "soil_moisture"],
  lastInspectionAt: ["огляд", "inspection", "inspection_date", "lastinspection"],
  geometryGeoJSON: ["geometry", "geojson", "polygon"],
  centerLat: ["centerlat", "lat", "latitude", "широта"],
  centerLng: ["centerlng", "lng", "longitude", "довгота"],
  sizeKm: ["size", "sizekm", "розмір"]
} as const;

const resolveHeaderKey = (header: string) => {
  const normalized = normalizeHeader(header);
  const entries = Object.entries(headerAliases) as Array<[keyof typeof headerAliases, readonly string[]]>;
  for (const [key, aliases] of entries) {
    if (aliases.includes(normalized)) return key;
  }
  return normalized;
};

const toRowMap = (row: Record<string, unknown>, headers: string[]) => {
  const mapped: Record<string, unknown> = {};
  headers.forEach((header) => {
    mapped[resolveHeaderKey(header)] = row[header];
  });
  return mapped;
};

const sheetToRows = (sheet: XLSX.WorkSheet) => {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
};

export const parseReportWorkbook = (buffer: Buffer): ImportResult => {
  const result: ImportResult = { fields: [], machinery: [], inventory: [], warnings: [] };
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetNames = workbook.SheetNames ?? [];

  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const normalizedName = normalizeHeader(name);
    const rows = sheetToRows(sheet);
    if (!rows.length) continue;
    const headers = Object.keys(rows[0] ?? {});
    const mappedRows = rows.map((row) => toRowMap(row, headers));

    if (["поля", "fields"].includes(normalizedName)) {
      for (const row of mappedRows) {
        const code = String(row.code ?? "").trim();
        const cropType = String(row.cropType ?? row.croptype ?? "").trim();
        const areaHa = toNumber(row.areaHa) ?? 0;
        const yieldForecastTons = toNumber(row.yieldForecastTons) ?? 0;
        const soilMoisturePct = toNumber(row.soilMoisturePct) ?? 0;
        const region = String(row.region ?? "Вінницька").trim() || "Вінницька";
        const district = String(row.district ?? "").trim();
        const geometry =
          normalizeGeoJSON(row.geometryGeoJSON) ||
          (() => {
            const lat = toNumber(row.centerLat);
            const lng = toNumber(row.centerLng);
            if (!lat || !lng) return null;
            const size = toNumber(row.sizeKm) ?? 0.3;
            return rectFromCenter(lat, lng, size);
          })();

        if (!code || !cropType || !district || !geometry) {
          result.warnings.push(`Поле пропущено: ${code || "невідомий код"}`);
          continue;
        }

        result.fields.push({
          code,
          name: String(row.name ?? `Поле ${code}`).trim() || `Поле ${code}`,
          region,
          district,
          cropType,
          status: toStatus(row.status),
          areaHa,
          sowingDate: parseDate(row.sowingDate),
          yieldForecastTons,
          soilMoisturePct,
          lastInspectionAt: parseDate(row.lastInspectionAt),
          geometryGeoJSON: geometry
        });
      }
    }

    if (["техніка", "machinery"].includes(normalizedName)) {
      for (const row of mappedRows) {
        const nameValue = String(row.name ?? "").trim();
        const type = String(row.type ?? "").trim();
        if (!nameValue || !type) {
          result.warnings.push("Техніка пропущена через відсутні дані");
          continue;
        }
        result.machinery.push({
          name: nameValue,
          type,
          status: toMachineryStatus(row.status)
        });
      }
    }

    if (["склад", "inventory", "warehouse"].includes(normalizedName)) {
      for (const row of mappedRows) {
        const nameValue = String(row.name ?? "").trim();
        const category = String(row.category ?? "").trim();
        const quantity = toNumber(row.quantity) ?? 0;
        const unit = String(row.unit ?? "").trim();
        const responsible = String(row.responsible ?? "").trim();
        const minThreshold = toNumber(row.minThreshold ?? row.minthreshold) ?? 0;
        if (!nameValue || !category || !unit || !responsible) {
          result.warnings.push(`Склад пропущено: ${nameValue || "невідомий ресурс"}`);
          continue;
        }
        result.inventory.push({
          name: nameValue,
          category,
          quantity,
          unit,
          responsible,
          minThreshold
        });
      }
    }
  }

  return result;
};

export type { FieldRow, MachineryRow, InventoryRow, ImportResult };
