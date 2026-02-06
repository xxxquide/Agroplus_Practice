export type InventoryStatusValue = "ENOUGH" | "LOW" | "CRITICAL";

export const inventoryStatusLabel: Record<InventoryStatusValue, string> = {
  ENOUGH: "Достатньо",
  LOW: "Низький запас",
  CRITICAL: "Критично"
};

export const inventoryStatusTone: Record<
  InventoryStatusValue,
  "success" | "warning" | "danger"
> = {
  ENOUGH: "success",
  LOW: "warning",
  CRITICAL: "danger"
};

export const computeInventoryStatus = (
  quantity: number,
  minThreshold: number
): InventoryStatusValue => {
  if (!Number.isFinite(quantity) || !Number.isFinite(minThreshold)) return "ENOUGH";
  if (quantity <= minThreshold * 0.5) return "CRITICAL";
  if (quantity <= minThreshold) return "LOW";
  return "ENOUGH";
};

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(value);

export const estimateUnitValue = (unit: string, category: string) => {
  const unitLower = unit.toLowerCase();
  const categoryLower = category.toLowerCase();

  if (categoryLower.includes("пальн") || categoryLower.includes("дизель")) return 58;
  if (categoryLower.includes("добрив")) return 18000;
  if (categoryLower.includes("насін")) return 24000;
  if (categoryLower.includes("ззр") || categoryLower.includes("гербіц")) return 220;
  if (categoryLower.includes("сервіс")) return 1200;
  if (categoryLower.includes("мастил")) return 180;

  if (unitLower.includes("л")) return 60;
  if (unitLower.includes("т")) return 15000;
  if (unitLower.includes("шт")) return 900;
  if (unitLower.includes("рулон")) return 2500;
  return 700;
};
