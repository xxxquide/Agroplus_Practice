import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const DEFAULT_DIESEL_PRICE = 60.5;

type MemoryFuelCache = {
  price: number;
  updatedAt: Date;
  history: number[];
};

export async function GET() {
  const globalCache = globalThis as unknown as { fuelCache?: MemoryFuelCache };
  let fuel: { priceUahPerL: number; updatedAt: Date } | null = null;
  let historyRows: Array<{ priceUahPerL: number }> = [];

  try {
    fuel = await prisma.fuelPrice.findFirst({ where: { fuelType: "Diesel" } });
    historyRows = await prisma.fuelPriceHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 7
    });
  } catch {
    fuel = null;
  }

  if (!fuel && globalCache.fuelCache) {
    return NextResponse.json({
      price: globalCache.fuelCache.price,
      updatedAt: globalCache.fuelCache.updatedAt,
      history: globalCache.fuelCache.history
    });
  }

  if (!fuel) {
    const fallbackHistory = Array.from({ length: 7 }).map((_, idx) =>
      Number((DEFAULT_DIESEL_PRICE - 0.2 * (6 - idx)).toFixed(2))
    );
    const payload = {
      price: DEFAULT_DIESEL_PRICE,
      updatedAt: new Date(),
      history: fallbackHistory
    };
    globalCache.fuelCache = payload;
    return NextResponse.json(payload);
  }

  const history = historyRows
    .slice()
    .reverse()
    .map((item: { priceUahPerL: number }) => item.priceUahPerL);
  const payload = {
    price: fuel.priceUahPerL,
    updatedAt: fuel.updatedAt,
    history
  };
  globalCache.fuelCache = payload;
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const price = Number(body?.price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ message: "Invalid price" }, { status: 400 });
  }

  const record = await prisma.fuelPrice.upsert({
    where: { fuelType: "Diesel" },
    update: { priceUahPerL: price, source: "Manual" },
    create: { fuelType: "Diesel", priceUahPerL: price, source: "Manual" }
  });

  await prisma.fuelPriceHistory.create({
    data: { priceUahPerL: record.priceUahPerL }
  });

  const history = await prisma.fuelPriceHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 7
  });

  const payload = {
    price: record.priceUahPerL,
    updatedAt: record.updatedAt,
    history: history
      .slice()
      .reverse()
      .map((item: { priceUahPerL: number }) => item.priceUahPerL)
  };

  const globalCache = globalThis as unknown as { fuelCache?: MemoryFuelCache };
  globalCache.fuelCache = payload;

  return NextResponse.json(payload);
}

export const runtime = "nodejs";
