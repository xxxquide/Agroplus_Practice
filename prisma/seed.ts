import { PrismaClient, UserRole, MachineryStatus, InventoryStatus, FieldStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const prisma = new PrismaClient();

function ensureUploadsDir() {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

function writePlaceholderFile(dir: string, originalName: string) {
  const ext = path.extname(originalName) || ".txt";
  const storedName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(dir, storedName);
  const content = `Placeholder for ${originalName}`;
  fs.writeFileSync(filePath, content, "utf8");
  return { storedName, sizeBytes: Buffer.byteLength(content) };
}

function rectGeoJSON(lat: number, lng: number, size = 0.015) {
  const coords = [
    [lng - size, lat - size],
    [lng + size, lat - size],
    [lng + size, lat + size],
    [lng - size, lat + size],
    [lng - size, lat - size]
  ];
  return JSON.stringify({ type: "Polygon", coordinates: [coords] });
}

async function main() {
  const passwordHash = await hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { login: "admin" },
    update: {},
    create: {
      login: "admin",
      name: "Адміністратор",
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  await prisma.inventoryLog.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.machinery.deleteMany();
  await prisma.fuelPrice.deleteMany();
  await prisma.field.deleteMany();
  await prisma.report.deleteMany();

  await prisma.machinery.createMany({
    data: [
      { name: "John Deere 8R", type: "Трактор", status: MachineryStatus.ACTIVE },
      { name: "Case IH Axial-Flow", type: "Комбайн", status: MachineryStatus.MAINTENANCE },
      { name: "Horsch Pronto", type: "Сівалка", status: MachineryStatus.ACTIVE },
      { name: "Amazone UX", type: "Обприскувач", status: MachineryStatus.OFFLINE }
    ]
  });

  await prisma.inventoryItem.createMany({
    data: [
      {
        name: "Селітра",
        category: "Добрива",
        quantity: 32,
        unit: "т",
        responsible: "Іваненко О.",
        status: InventoryStatus.LOW,
        minThreshold: 40
      },
      {
        name: "Гербіциди",
        category: "ЗЗР",
        quantity: 280,
        unit: "л",
        responsible: "Петренко М.",
        status: InventoryStatus.ENOUGH,
        minThreshold: 240
      },
      {
        name: "Паливо (дизель)",
        category: "Пальне",
        quantity: 5400,
        unit: "л",
        responsible: "Склад №1",
        status: InventoryStatus.LOW,
        minThreshold: 6000
      },
      {
        name: "Мастила",
        category: "Сервіс",
        quantity: 90,
        unit: "л",
        responsible: "С. Орел",
        status: InventoryStatus.ENOUGH,
        minThreshold: 70
      },
      {
        name: "Дизель",
        category: "Пальне",
        quantity: 12500,
        unit: "л",
        responsible: "В. Литвин",
        status: InventoryStatus.ENOUGH,
        minThreshold: 6000
      },
      {
        name: "Мінеральні добрива",
        category: "Добрива",
        quantity: 42,
        unit: "т",
        responsible: "О. Кравченко",
        status: InventoryStatus.LOW,
        minThreshold: 50
      },
      {
        name: "Насіння кукурудзи",
        category: "Насіння",
        quantity: 18,
        unit: "т",
        responsible: "І. Мельник",
        status: InventoryStatus.ENOUGH,
        minThreshold: 12
      },
      {
        name: "ЗЗР — фунгіциди",
        category: "ЗЗР",
        quantity: 420,
        unit: "л",
        responsible: "М. Гнатюк",
        status: InventoryStatus.CRITICAL,
        minThreshold: 500
      },
      {
        name: "Запчастини",
        category: "Сервіс",
        quantity: 85,
        unit: "шт",
        responsible: "С. Орел",
        status: InventoryStatus.LOW,
        minThreshold: 120
      },
      {
        name: "Плівка для силосу",
        category: "Складування",
        quantity: 60,
        unit: "рулон",
        responsible: "Н. Савчук",
        status: InventoryStatus.ENOUGH,
        minThreshold: 40
      },
      {
        name: "ЗЗР",
        category: "ЗЗР",
        quantity: 140,
        unit: "л",
        responsible: "М. Гнатюк",
        status: InventoryStatus.LOW,
        minThreshold: 180
      },
      {
        name: "Карбамід",
        category: "Добрива",
        quantity: 28,
        unit: "т",
        responsible: "Іваненко О.",
        status: InventoryStatus.LOW,
        minThreshold: 35
      },
      {
        name: "Нітроамофоска",
        category: "Добрива",
        quantity: 55,
        unit: "т",
        responsible: "О. Кравченко",
        status: InventoryStatus.ENOUGH,
        minThreshold: 40
      },
      {
        name: "Суперфосфат",
        category: "Добрива",
        quantity: 12,
        unit: "т",
        responsible: "О. Кравченко",
        status: InventoryStatus.CRITICAL,
        minThreshold: 30
      },
      {
        name: "Мікродобрива (бор)",
        category: "Добрива",
        quantity: 240,
        unit: "л",
        responsible: "В. Литвин",
        status: InventoryStatus.ENOUGH,
        minThreshold: 200
      },
      {
        name: "Мікродобрива (цинк)",
        category: "Добрива",
        quantity: 110,
        unit: "л",
        responsible: "В. Литвин",
        status: InventoryStatus.LOW,
        minThreshold: 180
      },
      {
        name: "Інсектициди",
        category: "ЗЗР",
        quantity: 90,
        unit: "л",
        responsible: "Петренко М.",
        status: InventoryStatus.CRITICAL,
        minThreshold: 200
      },
      {
        name: "Протруйники насіння",
        category: "ЗЗР",
        quantity: 60,
        unit: "л",
        responsible: "М. Гнатюк",
        status: InventoryStatus.LOW,
        minThreshold: 80
      },
      {
        name: "Регулятор росту",
        category: "ЗЗР",
        quantity: 95,
        unit: "л",
        responsible: "Петренко М.",
        status: InventoryStatus.LOW,
        minThreshold: 100
      },
      {
        name: "Фунгіциди (преміум)",
        category: "ЗЗР",
        quantity: 360,
        unit: "л",
        responsible: "М. Гнатюк",
        status: InventoryStatus.ENOUGH,
        minThreshold: 300
      },
      {
        name: "Насіння пшениці",
        category: "Насіння",
        quantity: 26,
        unit: "т",
        responsible: "І. Мельник",
        status: InventoryStatus.ENOUGH,
        minThreshold: 20
      },
      {
        name: "Насіння соняшника",
        category: "Насіння",
        quantity: 14,
        unit: "т",
        responsible: "І. Мельник",
        status: InventoryStatus.LOW,
        minThreshold: 18
      },
      {
        name: "Насіння сої",
        category: "Насіння",
        quantity: 6,
        unit: "т",
        responsible: "І. Мельник",
        status: InventoryStatus.CRITICAL,
        minThreshold: 16
      },
      {
        name: "Насіння ріпаку",
        category: "Насіння",
        quantity: 9,
        unit: "т",
        responsible: "І. Мельник",
        status: InventoryStatus.LOW,
        minThreshold: 12
      },
      {
        name: "Бензин А-95",
        category: "Пальне",
        quantity: 1800,
        unit: "л",
        responsible: "Склад №2",
        status: InventoryStatus.ENOUGH,
        minThreshold: 1200
      },
      {
        name: "Газ (LPG)",
        category: "Пальне",
        quantity: 900,
        unit: "л",
        responsible: "Склад №2",
        status: InventoryStatus.LOW,
        minThreshold: 1000
      },
      {
        name: "Фільтри масляні",
        category: "Сервіс",
        quantity: 120,
        unit: "шт",
        responsible: "С. Орел",
        status: InventoryStatus.ENOUGH,
        minThreshold: 80
      },
      {
        name: "Шини для техніки",
        category: "Сервіс",
        quantity: 18,
        unit: "шт",
        responsible: "С. Орел",
        status: InventoryStatus.LOW,
        minThreshold: 24
      },
      {
        name: "Мішки поліпропіленові",
        category: "Складування",
        quantity: 320,
        unit: "шт",
        responsible: "Н. Савчук",
        status: InventoryStatus.ENOUGH,
        minThreshold: 200
      },
      {
        name: "Палети дерев'яні",
        category: "Складування",
        quantity: 65,
        unit: "шт",
        responsible: "Н. Савчук",
        status: InventoryStatus.LOW,
        minThreshold: 90
      },
      {
        name: "Тара (каністри)",
        category: "Складування",
        quantity: 140,
        unit: "шт",
        responsible: "Н. Савчук",
        status: InventoryStatus.LOW,
        minThreshold: 200
      },
      {
        name: "Запчастини для сівалки",
        category: "Сервіс",
        quantity: 40,
        unit: "шт",
        responsible: "С. Орел",
        status: InventoryStatus.LOW,
        minThreshold: 60
      },
      {
        name: "Мастила трансмісійні",
        category: "Сервіс",
        quantity: 70,
        unit: "л",
        responsible: "С. Орел",
        status: InventoryStatus.LOW,
        minThreshold: 90
      },
      {
        name: "Олива гідравлічна",
        category: "Сервіс",
        quantity: 130,
        unit: "л",
        responsible: "С. Орел",
        status: InventoryStatus.ENOUGH,
        minThreshold: 100
      },
      {
        name: "ЗІЗ (респіратори)",
        category: "Безпека",
        quantity: 48,
        unit: "шт",
        responsible: "О. Кравченко",
        status: InventoryStatus.LOW,
        minThreshold: 60
      },
      {
        name: "Засоби миття техніки",
        category: "Сервіс",
        quantity: 55,
        unit: "л",
        responsible: "С. Орел",
        status: InventoryStatus.ENOUGH,
        minThreshold: 40
      }
    ]
  });

  await prisma.fuelPrice.createMany({
    data: [
      {
        fuelType: "Diesel",
        priceUahPerL: 56.4,
        source: "Manual"
      }
    ]
  });

  await prisma.fuelPriceHistory.deleteMany();
  const baseFuel = 56.4;
  const fuelHistory = Array.from({ length: 7 }).map((_, idx) => ({
    priceUahPerL: Math.round((baseFuel - 0.35 * (6 - idx)) * 100) / 100,
    createdAt: new Date(Date.now() - (6 - idx) * 24 * 60 * 60 * 1000)
  }));
  await prisma.fuelPriceHistory.createMany({ data: fuelHistory });

  const fieldSeeds = [
    { code: "A1", name: "Сонячне", lat: 49.2501, lng: 28.4832 },
    { code: "B3", name: "Діброва", lat: 49.2302, lng: 28.4621 },
    { code: "C2", name: "Лісова", lat: 49.2155, lng: 28.5054 },
    { code: "D7", name: "Світанок", lat: 49.2622, lng: 28.5211 },
    { code: "E4", name: "Річкова", lat: 49.2388, lng: 28.4484 },
    { code: "F6", name: "Подільська", lat: 49.2044, lng: 28.4766 }
  ];

  await prisma.field.createMany({
    data: fieldSeeds.map((field, idx) => ({
      code: field.code,
      name: field.name,
      region: "Вінницька",
      district: "Вінницький",
      cropType: idx % 2 === 0 ? "Пшениця" : "Кукурудза",
      status: FieldStatus.ACTIVE,
      areaHa: 48 + idx * 6,
      sowingDate: new Date(2025, 8, 12),
      yieldForecastTons: 180 + idx * 12,
      soilMoisturePct: 32 + idx,
      lastInspectionAt: new Date(2026, 0, 20),
      geometryGeoJSON: rectGeoJSON(field.lat, field.lng)
    }))
  });

  const uploadsDir = ensureUploadsDir();
  const reportEntries = [
    { name: "Звіт_урожайність_Q4.pdf", category: "Урожайність" },
    { name: "План_посівів_2026.xlsx", category: "Планування" },
    { name: "Склад_баланс_січень.pdf", category: "Склад" },
    { name: "Техніка_облік.xlsx", category: "Техніка" },
    { name: "Експорт_логістика.pdf", category: "Логістика" }
  ];

  for (const report of reportEntries) {
    const { storedName, sizeBytes } = writePlaceholderFile(uploadsDir, report.name);
    await prisma.report.create({
      data: {
        fileNameOriginal: report.name,
        fileNameStored: storedName,
        mimeType: report.name.endsWith(".pdf")
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeBytes,
        category: report.category,
        tags: "демо,внутрішній",
        description: "Автоматично згенеровано для демо",
        uploadedByUserId: admin.id
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
