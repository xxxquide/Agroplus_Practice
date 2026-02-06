"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { TooltipProps } from "recharts";
import { GlassCard } from "@/components/ui/glass";
import { formatNumber } from "@/lib/inventory";

export function YieldChartCard({
  data,
  actions
}: {
  data: { name: string; value: number }[];
  actions?: React.ReactNode;
}) {
  const total = data.reduce((sum, item) => {
    if (!Number.isFinite(item.value)) return sum;
    return sum + item.value;
  }, 0);

  const renderTooltip = ({
    active,
    payload,
    label
  }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0];
    const rawValue = typeof entry?.value === "number" ? entry.value : 0;
    const percent = total > 0 ? (rawValue / total) * 100 : null;

    return (
      <div className="rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-[11px] text-ink shadow-lg shadow-slate-900/5 backdrop-blur">
        <p className="text-[10px] uppercase tracking-wide text-ink/50">Культура</p>
        <p className="text-sm font-semibold">{label}</p>
        <div className="mt-2 flex items-center justify-between gap-4 text-xs">
          <div>
            <p className="text-ink/50">Прогноз</p>
            <p className="font-semibold">{formatNumber(rawValue)} т</p>
          </div>
          {percent !== null && (
            <div>
              <p className="text-ink/50">Частка</p>
              <p className="font-semibold">{percent.toFixed(1)}%</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <GlassCard className="h-full p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Прогноз врожайності</h3>
        {actions}
      </div>
      {data.length === 0 ? (
        <div className="mt-6 rounded-xl bg-white/60 px-4 py-6 text-center text-sm text-ink/60">
          Дані для прогнозу відсутні.
        </div>
      ) : (
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 16 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={0}
                minTickGap={0}
                height={32}
                tick={{ fill: "#5c6b82", fontSize: 10 }}
              />
              <Tooltip
                content={renderTooltip}
                cursor={{ fill: "rgba(0, 95, 115, 0.08)" }}
              />
              <Bar
                dataKey="value"
                radius={[8, 8, 0, 0]}
                fill="#005F73"
                activeBar={{ fill: "#0b6a7e" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}
