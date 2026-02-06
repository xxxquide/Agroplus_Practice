"use client";

import * as React from "react";
import { Cloud, CloudRain, CloudSnow, Sun, Wind } from "lucide-react";
import { GlassCard } from "@/components/ui/glass";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeather } from "./weather-context";
import { formatTime } from "@/lib/format";

function WeatherIcon({ icon, size = "sm" }: { icon: string; size?: "sm" | "lg" }) {
  const className =
    size === "lg" ? "h-7 w-7 text-ink/70" : "h-5 w-5 text-ink/70";
  switch (icon) {
    case "sun":
      return <Sun className={className} />;
    case "rain":
    case "storm":
      return <CloudRain className={className} />;
    case "snow":
      return <CloudSnow className={className} />;
    case "fog":
    case "cloud":
    default:
      return <Cloud className={className} />;
  }
}

export function WeatherCard() {
  const { loading, error, data, locationLabel } = useWeather();
  const [view, setView] = React.useState<"day" | "week">("day");

  const currentSlot = React.useMemo(() => {
    if (!data?.hourly?.length) return null;
    const now = Date.now();
    let best = data.hourly[0];
    let bestDiff = Math.abs(new Date(best.time).getTime() - now);
    data.hourly.forEach((slot) => {
      const diff = Math.abs(new Date(slot.time).getTime() - now);
      if (diff < bestDiff) {
        best = slot;
        bestDiff = diff;
      }
    });
    return best;
  }, [data?.hourly]);

  const dayLabels = React.useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.map((item) =>
      new Intl.DateTimeFormat("uk-UA", { weekday: "short" }).format(new Date(item.date))
    );
  }, [data?.daily]);

  return (
    <GlassCard className="h-full px-5 pt-5 pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Погода ({locationLabel})</h3>
        <div className="flex items-center gap-2 text-xs">
          <button
            className={`rounded-full px-3 py-1 ${view === "day" ? "bg-white/70 text-ink" : "bg-white/40 text-ink/60"}`}
            onClick={() => setView("day")}
          >
            День
          </button>
          <button
            className={`rounded-full px-3 py-1 ${view === "week" ? "bg-white/70 text-ink" : "bg-white/40 text-ink/60"}`}
            onClick={() => setView("week")}
          >
            Тиждень
          </button>
        </div>
        {data?.stale && (
          <span className="text-xs text-amber-700">
            Немає звʼязку, показано останні дані
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-10" />
        </div>
      ) : error || !data ? (
        <p className="mt-4 text-sm text-ink/60">{error}</p>
      ) : (
        <div className="mt-2 space-y-3">
          {currentSlot && (
            <div className="rounded-2xl bg-white/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-ink/50">Зараз</p>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
                      <WeatherIcon icon={currentSlot.icon} size="lg" />
                    </div>
                    <div>
                      <p className="text-3xl font-semibold text-ink">
                        {Math.round(currentSlot.temp)}°
                      </p>
                      <p className="text-xs text-ink/50">{formatTime(currentSlot.time)}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-ink/60">
                  <p>Вітер {Math.round(currentSlot.wind)} м/с</p>
                  <p>Вологість {Math.round(currentSlot.humidity)}%</p>
                  <p>Опади {Math.round(currentSlot.precip * 10) / 10} мм</p>
                  <p className="mt-1 text-[11px] text-ink/40">Оновлено: {formatTime(data.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
          {view === "day" ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.hourly.map((slot) => (
                <div
                  key={slot.time}
                  className="min-w-[70px] flex-shrink-0 rounded-xl bg-white/60 px-2 py-3 text-center text-xs text-ink/70"
                >
                  <span>{formatTime(slot.time)}</span>
                  <div className="mt-1 flex items-center justify-center">
                    <WeatherIcon icon={slot.icon} />
                  </div>
                  <span className="mt-1 block text-sm font-semibold text-ink">
                    {Math.round(slot.temp)}°
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {data.daily.slice(0, 7).map((slot, idx) => (
                <div
                  key={slot.date}
                  className="rounded-xl bg-white/60 px-3 py-3 text-xs text-ink/70"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase">{dayLabels[idx]}</span>
                    <WeatherIcon icon={slot.icon} />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-ink">
                    {Math.round(slot.tempMax)}° / {Math.round(slot.tempMin)}°
                  </div>
                  <p className="mt-1 text-[11px] text-ink/50">
                    Вітер {Math.round(slot.wind)} м/с
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-1 text-xs text-ink/70">
            <span className="flex items-center gap-2">
              <Wind size={14} /> {data.summary.wind} м/с
            </span>
            <span>Вологість {data.summary.humidity}%</span>
            <span>Опади {data.summary.precip} мм</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
