import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/db";
import { getSupabaseAdmin } from "../lib/supabase-admin";

type SeedFile = {
  originalName: string;
  category: string;
  tags?: string;
  description?: string;
  mimeType: string;
  buffer: Buffer;
};

const SEED_DIR = path.join(process.cwd(), "uploads", "seed-reports");

const escapePdfText = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const createPdfBuffer = (text: string) => {
  const escaped = escapePdfText(text);
  const stream = `BT /F1 18 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
};

const createXlsxBuffer = (sheetName: string, rows: (string | number)[][]) => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
};

const describeXlsx = (buffer: Buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetNames = workbook.SheetNames ?? [];
    const tags = sheetNames.slice(0, 4).join(", ");
    let description = "";
    if (sheetNames.length) {
      const firstSheet = workbook.Sheets[sheetNames[0]];
      const range = firstSheet?.["!ref"] ? XLSX.utils.decode_range(firstSheet["!ref"]) : null;
      const rows = range ? range.e.r - range.s.r + 1 : 0;
      const cols = range ? range.e.c - range.s.c + 1 : 0;
      description = `Лист "${sheetNames[0]}" • ${rows}×${cols}`;
    }
    return { tags, description };
  } catch {
    return { tags: "", description: "" };
  }
};

const sanitizeName = (name: string) =>
  name.replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/_+/g, "_");

async function ensureAdminUser() {
  const existing = await prisma.user.findUnique({ where: { login: "admin" } });
  if (existing) return existing;
  const passwordHash = await hash("admin123", 10);
  return prisma.user.create({
    data: {
      login: "admin",
      name: "Адміністратор",
      passwordHash,
      role: UserRole.ADMIN
    }
  });
}

async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  uploaderId: string
) {
  await fs.mkdir(SEED_DIR, { recursive: true });
  const safeName = sanitizeName(originalName);
  const storedFile = `${crypto.randomUUID()}-${safeName}`;
  const storagePath = `seed-reports/${storedFile}`;

  const localPath = path.join(SEED_DIR, storedFile);
  await fs.writeFile(localPath, buffer);

  const supabase = getSupabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "reports";

  if (supabase) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
    if (error) {
      console.warn(`Storage upload failed for ${originalName}: ${error.message}`);
    }
  } else {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not set — using local uploads only.");
  }

  return { storagePath, sizeBytes: buffer.length };
}

async function main() {
  const admin = await ensureAdminUser();

  const samples: SeedFile[] = [
    {
      originalName: "Seed_Фінзвіт_Q1_2026.pdf",
      category: "Фінанси",
      tags: "Q1,Фінзвіт",
      description: "Фінансовий звіт за Q1 2026",
      mimeType: "application/pdf",
      buffer: createPdfBuffer("Фінансовий звіт Q1 2026 • Агропідприємство АГРОПЛЮС")
    },
    {
      originalName: "Seed_Огляд_полів_березень_2026.pdf",
      category: "Поля",
      tags: "Огляд,Поля",
      description: "Огляд стану полів за березень",
      mimeType: "application/pdf",
      buffer: createPdfBuffer("Огляд полів • Березень 2026 • 12 ділянок")
    },
    {
      originalName: "Seed_Логістика_пальне_2026.pdf",
      category: "Логістика",
      tags: "Пальне,Логістика",
      description: "Споживання пального та логістика",
      mimeType: "application/pdf",
      buffer: createPdfBuffer("Логістика і пальне • План/Факт 2026")
    },
    {
      originalName: "Seed_План_посівів_2026.xlsx",
      category: "Планування",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: createXlsxBuffer("План", [
        [
          "Поле",
          "Культура",
          "Площа (га)",
          "План врожайності (т)",
          "Вологість (%)",
          "Дата посіву"
        ],
        ["A1", "Пшениця", 120, 340, 24, "2026-03-12"],
        ["B2", "Кукурудза", 180, 410, 21, "2026-04-02"],
        ["C3", "Ячмінь", 90, 260, 28, "2026-03-25"]
      ])
    },
    {
      originalName: "Seed_Оперативні_показники_тиждень_05.xlsx",
      category: "Оперативні",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: createXlsxBuffer("Показники", [
        ["Дата", "Темп °C", "Опади мм", "Вологість %", "Поля активні"],
        ["2026-02-01", 2.1, 0, 64, 18],
        ["2026-02-02", 1.3, 2, 66, 18],
        ["2026-02-03", -1.0, 5, 69, 17],
        ["2026-02-04", 0.8, 0, 61, 18]
      ])
    }
  ];

  const existing = await prisma.report.findMany({
    where: { fileNameOriginal: { in: samples.map((item) => item.originalName) } },
    select: { fileNameOriginal: true }
  });
  const existingSet = new Set(existing.map((item) => item.fileNameOriginal));

  let created = 0;
  for (const sample of samples) {
    if (existingSet.has(sample.originalName)) {
      console.log(`Skipping existing: ${sample.originalName}`);
      continue;
    }
    const derived =
      sample.mimeType.includes("spreadsheet")
        ? describeXlsx(sample.buffer)
        : { tags: "", description: "" };

    const tags = sample.tags ?? derived.tags ?? "звіт";
    const description = sample.description ?? derived.description ?? "Завантажено з панелі";

    const { storagePath, sizeBytes } = await uploadBuffer(
      sample.buffer,
      sample.mimeType,
      sample.originalName,
      admin.id
    );

    await prisma.report.create({
      data: {
        fileNameOriginal: sample.originalName,
        fileNameStored: storagePath,
        mimeType: sample.mimeType,
        sizeBytes,
        category: sample.category,
        tags,
        description,
        uploadedByUserId: admin.id
      }
    });
    created += 1;
    console.log(`Created: ${sample.originalName}`);
  }

  console.log(`Done. Created ${created} reports.`);
}

main()
  .catch((error) => {
    console.error("Seed reports failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
