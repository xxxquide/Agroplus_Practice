import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

const DEFAULT_LAT = 49.2331;
const DEFAULT_LON = 28.4682;
const TTL_MINUTES = 15;

function isFresh(updatedAt: Date, ttlMinutes: number) {
  return Date.now() - updatedAt.getTime() < ttlMinutes * 60 * 1000;
}

function mapWeatherCode(code: number) {
  if ([0, 1].includes(code)) return "sun";
  if ([2, 3].includes(code)) return "cloud";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "cloud";
}

function computeRisk(slots: { wind: number; precip: number }[]) {
  const maxWind = Math.max(...slots.map((s) => s.wind));
  const maxPrecip = Math.max(...slots.map((s) => s.precip));
  if (maxWind >= 14 || maxPrecip >= 4) {
    return { label: "Високий", tone: "danger" as const };
  }
  if (maxWind >= 9 || maxPrecip >= 1.5) {
    return { label: "Середній", tone: "warning" as const };
  }
  return { label: "Низький", tone: "success" as const };
}

async function fetchWeather(lat: number, lon: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code"
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code"
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code"
  );
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "Europe/Kyiv");

  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error("Weather fetch failed");
  }
  const data = await response.json();

  const currentTime = data.current?.time ?? data.hourly.time[0];
  const startIndex = Math.max(
    0,
    data.hourly.time.findIndex((time: string) => time >= currentTime)
  );

  const hourlySlots = data.hourly.time
    .slice(startIndex, startIndex + 24)
    .map((time: string, idx: number) => {
      const offset = startIndex + idx;
      return {
        time,
        temp: data.hourly.temperature_2m[offset],
        humidity: data.hourly.relative_humidity_2m[offset],
        wind: data.hourly.wind_speed_10m[offset],
        precip: data.hourly.precipitation[offset],
        icon: mapWeatherCode(data.hourly.weather_code[offset])
      };
    });

  const dailySlots = data.daily.time.slice(0, 7).map((time: string, idx: number) => ({
    date: time,
    tempMax: data.daily.temperature_2m_max[idx],
    tempMin: data.daily.temperature_2m_min[idx],
    wind: data.daily.wind_speed_10m_max[idx],
    precip: data.daily.precipitation_sum[idx],
    icon: mapWeatherCode(data.daily.weather_code[idx])
  }));

  const summary = {
    wind: Math.round(
      hourlySlots.reduce((acc: number, item: { wind: number }) => acc + item.wind, 0) /
        Math.max(hourlySlots.length, 1)
    ),
    humidity: Math.round(
      hourlySlots.reduce((acc: number, item: { humidity: number }) => acc + item.humidity, 0) /
        Math.max(hourlySlots.length, 1)
    ),
    precip: Math.round(
      hourlySlots.reduce((acc: number, item: { precip: number }) => acc + item.precip, 0) * 10
    ) / 10
  };

  const risk = computeRisk(hourlySlots);

  return { hourly: hourlySlots, daily: dailySlots, summary, risk };
}

type MemoryWeatherCache = { payload: string; updatedAt: Date };

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat") ?? DEFAULT_LAT);
  const lon = Number(searchParams.get("lon") ?? DEFAULT_LON);
  const safeLat = Number.isFinite(lat) ? lat : DEFAULT_LAT;
  const safeLon = Number.isFinite(lon) ? lon : DEFAULT_LON;
  const key = `${safeLat.toFixed(2)}:${safeLon.toFixed(2)}`;

  const globalCache = globalThis as unknown as {
    weatherCache?: Map<string, MemoryWeatherCache>;
  };
  const memoryStore = globalCache.weatherCache ?? new Map<string, MemoryWeatherCache>();
  globalCache.weatherCache = memoryStore;
  const memoryCache = memoryStore.get(key);

  let cached: { payload: string; updatedAt: Date; id: string } | null = null;
  try {
    cached = await prisma.weatherCache.findFirst({ where: { key } });
  } catch {
    cached = null;
  }

  if (cached && isFresh(cached.updatedAt, TTL_MINUTES)) {
    return NextResponse.json({
      ...JSON.parse(cached.payload),
      updatedAt: cached.updatedAt,
      stale: false,
      cached: true
    });
  }
  if (memoryCache && isFresh(memoryCache.updatedAt, TTL_MINUTES)) {
    return NextResponse.json({
      ...JSON.parse(memoryCache.payload),
      updatedAt: memoryCache.updatedAt,
      stale: false,
      cached: true
    });
  }

  try {
    const payload = await fetchWeather(safeLat, safeLon);
    let updatedAt = new Date();
    try {
      const record = cached
        ? await prisma.weatherCache.update({
            where: { id: cached.id },
            data: { payload: JSON.stringify(payload), key }
          })
        : await prisma.weatherCache.create({
            data: { key, payload: JSON.stringify(payload) }
          });
      updatedAt = record.updatedAt;
    } catch {
      updatedAt = new Date();
    }
    memoryStore.set(key, { payload: JSON.stringify(payload), updatedAt });

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
    try {
      const fallback = await prisma.weatherCache.findFirst();
      if (fallback) {
        return NextResponse.json({
          ...JSON.parse(fallback.payload),
          updatedAt: fallback.updatedAt,
          stale: true,
          cached: true
        });
      }
    } catch {}

    return NextResponse.json(
      { message: "Немає зв'язку з погодним сервісом" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
