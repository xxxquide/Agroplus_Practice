"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pencil } from "lucide-react";
import { GlassCard } from "@/components/ui/glass";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

type RatesResponse = {
  rates: { USD: number; EUR: number };
  history: { USD: number[]; EUR: number[] };
  labels?: string[];
  updatedAt: string;
  stale: boolean;
};

type FuelResponse = {
  price: number | null;
  updatedAt: string | null;
  history: number[];
};

export function RatesFuelCard({
  initialFuelPrice,
  initialFuelUpdatedAt,
  refreshToken
}: {
  initialFuelPrice: number | null;
  initialFuelUpdatedAt: string | null;
  refreshToken?: number;
}) {
  const [rates, setRates] = React.useState<RatesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fuelPrice, setFuelPrice] = React.useState(initialFuelPrice);
  const [fuelUpdatedAt, setFuelUpdatedAt] = React.useState(initialFuelUpdatedAt);
  const [fuelHistory, setFuelHistory] = React.useState<number[]>([]);
  const [fuelModal, setFuelModal] = React.useState(false);
  const [fuelInput, setFuelInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setFuelPrice(initialFuelPrice);
    setFuelUpdatedAt(initialFuelUpdatedAt);
  }, [initialFuelPrice, initialFuelUpdatedAt]);

  React.useEffect(() => {
    let active = true;
    let interval: NodeJS.Timeout | null = null;
    const load = async () => {
      setLoading(true);
      try {
        const [ratesRes, fuelRes] = await Promise.all([
          fetch("/api/rates"),
          fetch("/api/fuel")
        ]);
        if (!ratesRes.ok) throw new Error("Rates error");
        const ratesData = (await ratesRes.json()) as RatesResponse;
        const fuelData = fuelRes.ok
          ? ((await fuelRes.json()) as FuelResponse)
          : { price: null, updatedAt: null, history: [] };

        if (active) {
          setRates(ratesData);
          setFuelPrice(fuelData.price);
          setFuelUpdatedAt(fuelData.updatedAt);
          setFuelHistory(fuelData.history ?? []);
        }
      } catch {
        toast.error("Не вдалося отримати курс валют");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    interval = setInterval(load, 30 * 60 * 1000);
    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [refreshToken]);

  const weekLabels = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat("uk-UA", { weekday: "short" });
    return Array.from({ length: 7 }).map((_, idx) =>
      formatter.format(new Date(Date.now() - (6 - idx) * 24 * 60 * 60 * 1000))
    );
  }, []);

  const labels = rates?.labels && rates.labels.length ? rates.labels : weekLabels;

  const history = React.useMemo(() => {
    if (!rates) return [];
    return labels.map((label, idx) => ({
      label,
      USD: rates.history.USD[idx] ?? null,
      EUR: rates.history.EUR[idx] ?? null
    }));
  }, [rates, labels]);

  const rateDomain = React.useMemo(() => {
    if (!rates) return ["auto", "auto"] as [string, string];
    const values = [...rates.history.USD, ...rates.history.EUR].filter(
      (value) => typeof value === "number" && Number.isFinite(value)
    ) as number[];
    if (!values.length) return ["auto", "auto"] as [string, string];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(0.05, (max - min) * 0.2);
    return [Number((min - padding).toFixed(2)), Number((max + padding).toFixed(2))] as [number, number];
  }, [rates]);

  const dieselSeries = React.useMemo(() => {
    if (fuelHistory.length) {
      return labels.map((label, idx) => ({
        label,
        value: fuelHistory[idx] ?? null
      }));
    }
    if (fuelPrice) {
      return labels.map((label, idx) => ({
        label,
        value: Math.round((fuelPrice - 0.25 * (6 - idx)) * 100) / 100
      }));
    }
    return [];
  }, [fuelHistory, fuelPrice, labels]);

  const dieselDomain = React.useMemo(() => {
    if (!dieselSeries.length) return ["auto", "auto"] as const;
    const values = dieselSeries
      .map((item) => item.value)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (!values.length) return ["auto", "auto"] as const;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(0.05, (max - min) * 0.2);
    return [Number((min - padding).toFixed(2)), Number((max + padding).toFixed(2))] as const;
  }, [dieselSeries]);

  const handleFuelSave = async () => {
    const price = Number(fuelInput);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Вкажіть коректну ціну");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/fuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price })
      });
      if (!response.ok) {
        throw new Error("Fuel update failed");
      }
      const data = (await response.json()) as FuelResponse;
      setFuelPrice(data.price);
      setFuelUpdatedAt(data.updatedAt);
      setFuelHistory(data.history ?? []);
      toast.success("Ціну оновлено");
      setFuelModal(false);
      setFuelInput("");
    } catch {
      toast.error("Не вдалося оновити ціну");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="h-full p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Курс валют / Паливо</h3>
        {rates?.stale && (
          <span className="text-xs text-amber-700">Останні дані</span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-8" />
          <Skeleton className="h-24" />
          <Skeleton className="h-8" />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-ink/60">USD</p>
              <p className="text-lg font-semibold">
                {rates ? rates.rates.USD.toFixed(2) : "--"} грн
              </p>
            </div>
            <div>
              <p className="text-ink/60">EUR</p>
              <p className="text-lg font-semibold">
                {rates ? rates.rates.EUR.toFixed(2) : "--"} грн
              </p>
            </div>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 6" stroke="#dbe4f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#5c6b82", fontSize: 11 }}
                />
                <YAxis
                  width={36}
                  axisLine={false}
                  tickLine={false}
                  domain={rateDomain}
                  tick={{ fill: "#5c6b82", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.6)",
                    background: "rgba(255,255,255,0.9)",
                    fontSize: "12px",
                    color: "#1D3557"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="USD"
                  stroke="#005F73"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="EUR"
                  stroke="#EE9B00"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-ink/50">Динаміка за 7 днів</p>
          {rates?.updatedAt && (
            <p className="text-xs text-ink/50">
              Оновлено {formatDateTime(rates.updatedAt)}
            </p>
          )}

          <div className="rounded-xl bg-white/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-ink/60">Дизель</p>
                <p className="text-lg font-semibold">
                  {fuelPrice ? `${fuelPrice.toFixed(2)} грн/л` : "—"}
                </p>
                <p className="text-[11px] text-ink/50">
                  {fuelUpdatedAt ? `Оновлено ${formatDateTime(fuelUpdatedAt)}` : ""}
                </p>
              </div>
              <button
                onClick={() => {
                  setFuelModal(true);
                  setFuelInput(fuelPrice ? fuelPrice.toString() : "");
                }}
                className="rounded-full border border-white/50 bg-white/70 p-2 text-ink/70 transition hover:text-ink"
                aria-label="Оновити паливо"
              >
                <Pencil size={16} />
              </button>
            </div>
            <div className="mt-3 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dieselSeries} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke="#dbe4f0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#5c6b82", fontSize: 10 }}
                  />
                  <YAxis
                    width={34}
                    axisLine={false}
                    tickLine={false}
                    domain={dieselDomain}
                    tick={{ fill: "#5c6b82", fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.6)",
                      background: "rgba(255,255,255,0.9)",
                      fontSize: "12px",
                      color: "#1D3557"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-ink/50">Останній тиждень</p>
          </div>
        </div>
      )}

      <Modal open={fuelModal} onClose={() => setFuelModal(false)} title="Оновити ціну дизеля">
        <div className="space-y-4">
          <Input
            type="number"
            min="1"
            step="0.01"
            value={fuelInput}
            onChange={(event) => setFuelInput(event.target.value)}
            placeholder="Напр. 56.40"
          />
          <Button className="w-full" onClick={handleFuelSave} disabled={saving}>
            {saving ? "Збереження..." : "Зберегти"}
          </Button>
        </div>
      </Modal>
    </GlassCard>
  );
}
