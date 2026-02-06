import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

const TTL_MINUTES = 60;

function isFresh(updatedAt: Date, ttlMinutes: number) {
  return Date.now() - updatedAt.getTime() < ttlMinutes * 60 * 1000;
}

function isPayloadValid(payload: { history?: { USD?: number[]; EUR?: number[] }; labels?: string[] }) {
  const usd = payload.history?.USD ?? [];
  const eur = payload.history?.EUR ?? [];
  const labels = payload.labels ?? [];
  return usd.length === 7 && eur.length === 7 && labels.length === 7;
}

function formatYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function formatLabel(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit" }).format(date);
}

async function fetchRateForDate(code: string, date: string) {
  const url = new URL("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange");
  url.searchParams.set("valcode", code);
  url.searchParams.set("date", date);
  url.searchParams.set("json", "");

  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error("Rates fetch failed");
  }
  const data = (await response.json()) as { rate?: number }[];
  return data?.[0]?.rate ?? null;
}

async function fetchRates() {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 6);

  const dates = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + idx);
    return date;
  });

  const dateKeys = dates.map((date) => formatYmd(date));
  const [usdRates, eurRates] = await Promise.all([
    Promise.all(dateKeys.map((date) => fetchRateForDate("USD", date))),
    Promise.all(dateKeys.map((date) => fetchRateForDate("EUR", date)))
  ]);

  const historyUSD: number[] = [];
  const historyEUR: number[] = [];
  let lastUsd = 0;
  let lastEur = 0;

  dateKeys.forEach((_, idx) => {
    const usd = usdRates[idx];
    const eur = eurRates[idx];
    if (typeof usd === "number") lastUsd = usd;
    if (typeof eur === "number") lastEur = eur;
    historyUSD.push(Number((usd ?? lastUsd).toFixed(2)));
    historyEUR.push(Number((eur ?? lastEur).toFixed(2)));
  });

  return {
    rates: {
      USD: historyUSD[historyUSD.length - 1] ?? lastUsd,
      EUR: historyEUR[historyEUR.length - 1] ?? lastEur
    },
    history: {
      USD: historyUSD,
      EUR: historyEUR
    },
    labels: dates.map(formatLabel)
  };
}

type MemoryRatesCache = { payload: string; updatedAt: Date };

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const globalCache = globalThis as unknown as { ratesCache?: MemoryRatesCache };
  const memoryCache = globalCache.ratesCache;
  let cached: { payload: string; updatedAt: Date; id: string } | null = null;

  try {
    cached = await prisma.rateCache.findFirst();
  } catch {
    cached = null;
  }

  if (cached && isFresh(cached.updatedAt, TTL_MINUTES)) {
    const payload = JSON.parse(cached.payload);
    if (isPayloadValid(payload)) {
      return NextResponse.json({
        ...payload,
        updatedAt: cached.updatedAt,
        stale: false,
        cached: true
      });
    }
  }
  if (memoryCache && isFresh(memoryCache.updatedAt, TTL_MINUTES)) {
    const payload = JSON.parse(memoryCache.payload);
    if (isPayloadValid(payload)) {
      return NextResponse.json({
        ...payload,
        updatedAt: memoryCache.updatedAt,
        stale: false,
        cached: true
      });
    }
  }

  try {
    const payload = await fetchRates();
    let updatedAt = new Date();

    try {
      const record = cached
        ? await prisma.rateCache.update({
            where: { id: cached.id },
            data: { payload: JSON.stringify(payload) }
          })
        : await prisma.rateCache.create({ data: { payload: JSON.stringify(payload) } });
      updatedAt = record.updatedAt;
    } catch {
      updatedAt = new Date();
    }
    globalCache.ratesCache = { payload: JSON.stringify(payload), updatedAt };

    return NextResponse.json({
      ...payload,
      updatedAt,
      stale: false,
      cached: false
    });
  } catch {
    if (cached) {
      return NextResponse.json({
        ...JSON.parse(cached.payload),
        updatedAt: cached.updatedAt,
        stale: true,
        cached: true
      });
    }
    if (memoryCache) {
      return NextResponse.json({
        ...JSON.parse(memoryCache.payload),
        updatedAt: memoryCache.updatedAt,
        stale: true,
        cached: true
      });
    }

    return NextResponse.json(
      { message: "Немає зв'язку з сервісом курсу" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
