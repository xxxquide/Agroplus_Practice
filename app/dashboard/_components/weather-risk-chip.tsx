"use client";

import { KPIChip } from "@/components/ui/kpi-chip";
import { useWeather } from "./weather-context";

export function WeatherRiskChip() {
  const { data, loading } = useWeather();

  if (loading) {
    return <KPIChip label="Ризик погоди" value="..." />;
  }

  if (!data) {
    return <KPIChip label="Ризик погоди" value="Невідомо" />;
  }

  return (
    <KPIChip
      label="Ризик погоди"
      value={data.risk.label}
      className={
        data.risk.tone === "danger"
          ? "bg-[#FEE2E2]/80"
          : data.risk.tone === "warning"
          ? "bg-[#FDE68A]/80"
          : "bg-[#DCFCE7]/80"
      }
    />
  );
}
