"use client";

import * as React from "react";
import {
  Bell,
  HelpCircle,
  PlusCircle,
  RefreshCw,
  FileDown,
  LifeBuoy,
  FilePlus2,
  Wrench,
  Sprout
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui/glass";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KPIChip } from "@/components/ui/kpi-chip";
import { FloatingDock } from "@/components/ui/floating-dock";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/format";
import { WeatherProvider } from "./weather-context";
import { WeatherCard } from "./weather-card";
import { WeatherRiskChip } from "./weather-risk-chip";
import { RatesFuelCard } from "./rates-fuel-card";
import { MachineryCard } from "./machinery-card";
import { ReportsCard, type ReportItem } from "./reports-card";
import { UploadReportModal } from "./upload-report-modal";
import { LocalReportModal } from "./local-report-modal";
import { MachineryModal, type MachineryInput } from "./machinery-modal";
import { YieldChartCard } from "./yield-chart";
import { YieldModal, type YieldPoint } from "./yield-modal";

const STORAGE_KEYS = {
  reports: "agroplus.localReports"
};

const REPORT_PRESETS: ReportItem[] = [
  {
    id: "preset-report-1",
    fileNameOriginal: "Фінзвіт_Q1_2026.pdf",
    mimeType: "application/pdf",
    uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    uploadedBy: "Бухгалтерія",
    category: "Фінанси",
    localOnly: true
  },
  {
    id: "preset-report-2",
    fileNameOriginal: "План_посівів_оновлений.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    uploadedBy: "Планування",
    category: "Планування",
    localOnly: true
  }
];

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function DashboardClient({
  kpis,
  reports,
  machinery,
  machineryUpdatedAt,
  fuelPrice,
  fuelUpdatedAt,
  yieldData,
  manualYield,
  avatar
}: {
  kpis: {
    areaHa: number;
    activeFields: number;
    plannedTasks: number;
  };
  reports: ReportItem[];
  machinery: {
    id: string;
    name: string;
    type: string;
    status: "ACTIVE" | "MAINTENANCE" | "OFFLINE";
  }[];
  machineryUpdatedAt: string;
  fuelPrice: number | null;
  fuelUpdatedAt: string | null;
  yieldData: { name: string; value: number }[];
  manualYield: { id: string; name: string; value: number; createdAt: string }[];
  avatar: string | null;
}) {
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [localReportOpen, setLocalReportOpen] = React.useState(false);
  const [machineryOpen, setMachineryOpen] = React.useState(false);
  const [yieldOpen, setYieldOpen] = React.useState(false);
  const [serverReports, setServerReports] = React.useState(reports);
  const [localReports, setLocalReports] = React.useState<ReportItem[]>([]);
  const [machineryItems, setMachineryItems] = React.useState(machinery);
  const [manualYieldItems, setManualYieldItems] = React.useState(manualYield);
  const [localReady, setLocalReady] = React.useState(false);
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [machineryPage, setMachineryPage] = React.useState(1);
  const [reportsPage, setReportsPage] = React.useState(1);
  const [machineryUpdated, setMachineryUpdated] = React.useState(machineryUpdatedAt);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<
    { id: string; title: string; body: string | null; createdAt: string; readAt: string | null }[]
  >([]);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const router = useRouter();

  React.useEffect(() => {
    setServerReports(reports);
  }, [reports]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const storedReports = safeParse<ReportItem[]>(
      localStorage.getItem(STORAGE_KEYS.reports),
      []
    );
    setLocalReports(storedReports);
    setLocalReady(true);
  }, []);

  React.useEffect(() => {
    if (!localReady) return;
    localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(localReports));
  }, [localReports, localReady]);
  
  React.useEffect(() => {
    setMachineryItems(machinery);
  }, [machinery]);

  React.useEffect(() => {
    setMachineryUpdated(machineryUpdatedAt);
  }, [machineryUpdatedAt]);

  React.useEffect(() => {
    setManualYieldItems(manualYield);
  }, [manualYield]);

  const mergedReports = React.useMemo(() => {
    const all = [...localReports, ...serverReports];
    return all.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [localReports, serverReports]);

  const reportsPageSize = 3;
  const reportsPageCount = Math.max(1, Math.ceil(mergedReports.length / reportsPageSize));
  const pagedReports = React.useMemo(() => {
    const start = (reportsPage - 1) * reportsPageSize;
    return mergedReports.slice(start, start + reportsPageSize);
  }, [mergedReports, reportsPage]);

  const mergedMachinery = React.useMemo(() => {
    return [...machineryItems].slice(0, 12);
  }, [machineryItems]);

  const machineryPageSize = 2;
  const machineryPageCount = Math.max(1, Math.ceil(mergedMachinery.length / machineryPageSize));
  const pagedMachinery = React.useMemo(() => {
    const start = (machineryPage - 1) * machineryPageSize;
    return mergedMachinery.slice(start, start + machineryPageSize);
  }, [mergedMachinery, machineryPage]);

  React.useEffect(() => {
    if (machineryPage > machineryPageCount) {
      setMachineryPage(machineryPageCount);
    }
  }, [machineryPage, machineryPageCount]);

  React.useEffect(() => {
    if (reportsPage > reportsPageCount) {
      setReportsPage(reportsPageCount);
    }
  }, [reportsPage, reportsPageCount]);

  const mergedYieldData = React.useMemo(() => {
    const excluded = new Set([
      "Рис",
      "Соя",
      "Горох",
      "Квасоля",
      "Нут",
      "Сочевиця",
      "Соняшник",
      "Ріпак",
      "Льон",
      "Гірчиця"
    ]);
    const map = new Map<string, number>();
    yieldData.forEach((item) => {
      if (excluded.has(item.name)) return;
      map.set(item.name, (map.get(item.name) ?? 0) + item.value);
    });
    manualYieldItems.forEach((item) => {
      if (excluded.has(item.name)) return;
      map.set(item.name, (map.get(item.name) ?? 0) + item.value);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value
    }));
  }, [yieldData, manualYieldItems]);

  const handleUploaded = (report: ReportItem) => {
    setServerReports((prev) => [report, ...prev].slice(0, 5));
  };

  const handleRefresh = () => {
    setRefreshToken((prev) => prev + 1);
    router.refresh();
    toast.success("Дані оновлено");
  };

  const handleLocalReportAdd = (report: ReportItem) => {
    setLocalReports((prev) => [report, ...prev]);
  };

  const handleMachineryAdd = async (item: MachineryInput) => {
    try {
      const response = await fetch("/api/machinery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          type: item.type,
          status: item.status
        })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setMachineryItems((prev) => {
        const index = prev.findIndex((entry) => entry.id === data.item.id);
        if (index === -1) return [data.item, ...prev];
        const next = [...prev];
        next[index] = data.item;
        return next;
      });
      setMachineryUpdated(new Date().toISOString());
      toast.success("Техніку додано");
    } catch {
      toast.error("Не вдалося додати техніку");
    }
  };

  const handleYieldAdd = async (item: YieldPoint) => {
    try {
      const response = await fetch("/api/yield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropType: item.name,
          value: item.value
        })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setManualYieldItems((prev) => [
        { id: data.item.id, name: data.item.cropType, value: data.item.value, createdAt: data.item.createdAt },
        ...prev
      ]);
      toast.success("Прогноз додано");
    } catch {
      toast.error("Не вдалося додати прогноз");
    }
  };

  const handleExport = () => {
    window.open("/api/export", "_blank");
  };

  const loadNotifications = React.useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Failed");
      const data = (await response.json()) as {
        notifications: { id: string; title: string; body: string | null; createdAt: string; readAt: string | null }[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      toast.error("Не вдалося отримати сповіщення");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markAllRead = React.useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all" })
      });
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      toast.error("Не вдалося оновити сповіщення");
    }
  }, []);

  return (
    <GlassPanel className="relative flex min-h-[80vh] w-full flex-col gap-6 rounded-[32px] p-8 pb-[74px]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50">AGROPLUS</p>
          <h1 className="text-2xl font-semibold">Оперативна панель</h1>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <div className="min-w-[180px] max-w-xs flex-1">
            <Input placeholder="Пошук…" />
          </div>
          <button
            onClick={() => {
              setNotificationsOpen(true);
              void loadNotifications();
            }}
            className="rounded-full border border-white/50 bg-white/70 p-2 text-ink/70 transition hover:text-ink"
            aria-label="Сповіщення"
          >
            <span className="relative">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-semibold text-[#1a1200]">
                  {unreadCount}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => router.push("/support")}
            className="rounded-full border border-white/50 bg-white/70 p-2 text-ink/70 transition hover:text-ink"
            aria-label="Підтримка"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-semibold text-white"
            aria-label="Профіль"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              "АД"
            )}
          </button>
        </div>
      </header>

      <WeatherProvider refreshToken={refreshToken}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPIChip label="Площа під посівами" value={`${kpis.areaHa.toFixed(0)} га`} />
          <KPIChip label="Активні поля" value={`${kpis.activeFields}`} />
          <KPIChip label="Заплановані роботи" value={`${kpis.plannedTasks}`} />
          <WeatherRiskChip />
        </div>

        <div className="grid gap-6 xl:grid-cols-5 xl:grid-rows-[auto_auto]">
          <div className="xl:col-span-2 xl:col-start-1 xl:row-start-1">
            <WeatherCard />
          </div>
          <div className="xl:col-span-1 xl:col-start-3 xl:row-span-2">
            <RatesFuelCard
              initialFuelPrice={fuelPrice}
              initialFuelUpdatedAt={fuelUpdatedAt}
              refreshToken={refreshToken}
            />
          </div>
          <div className="xl:col-span-2 xl:col-start-4 xl:row-start-1">
            <ReportsCard
              reports={pagedReports}
              page={reportsPage}
              pageCount={reportsPageCount}
              onPageChange={setReportsPage}
              onUploadClick={() => setUploadOpen(true)}
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setLocalReportOpen(true)}
                >
                  <FilePlus2 size={14} /> Локально
                </Button>
              }
            />
          </div>
          <div className="xl:col-span-2 xl:col-start-1 xl:row-start-2">
            <MachineryCard
              items={pagedMachinery}
              updatedAt={machineryUpdated}
              page={machineryPage}
              pageCount={machineryPageCount}
              onPageChange={setMachineryPage}
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMachineryOpen(true)}
                >
                  <Wrench size={14} /> Додати
                </Button>
              }
            />
          </div>
          <div className="xl:col-span-2 xl:col-start-4 xl:row-start-2">
            <YieldChartCard
              data={mergedYieldData}
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setYieldOpen(true)}
                >
                  <Sprout size={14} /> Додати
                </Button>
              }
            />
          </div>
        </div>
      </WeatherProvider>

      <FloatingDock className="absolute bottom-[20px] left-1/2 -translate-x-1/2">
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-[#1a1200] shadow-md"
        >
          <PlusCircle size={14} /> Додати звіт
        </button>
        <button
          onClick={() => router.push("/warehouse?add=1")}
          className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-xs font-semibold text-ink/80"
        >
          <PlusCircle size={14} /> Додати ресурс
        </button>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-xs font-semibold text-ink/80"
        >
          <RefreshCw size={14} /> Оновити дані
        </button>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-xs font-semibold text-ink/80"
        >
          <FileDown size={14} /> Експорт
        </button>
        <button
          onClick={() => router.push("/support")}
          className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-xs font-semibold text-ink/80"
        >
          <LifeBuoy size={14} /> Підтримка
        </button>
      </FloatingDock>

      <UploadReportModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />
      <LocalReportModal
        open={localReportOpen}
        onClose={() => setLocalReportOpen(false)}
        onAdd={handleLocalReportAdd}
      />
      <MachineryModal
        open={machineryOpen}
        onClose={() => setMachineryOpen(false)}
        onAdd={handleMachineryAdd}
      />
      <YieldModal
        open={yieldOpen}
        onClose={() => setYieldOpen(false)}
        onAdd={handleYieldAdd}
      />
      <Modal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Сповіщення"
        className="max-w-xl"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink/60">
            <span>Останні події</span>
            <button
              className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[11px] font-medium text-ink/70"
              onClick={markAllRead}
            >
              Позначити як прочитане
            </button>
          </div>
          {notificationsLoading ? (
            <p className="text-sm text-ink/60">Завантаження...</p>
          ) : notifications.length ? (
            <div className="space-y-2">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border border-white/60 px-3 py-2 text-sm ${
                    item.readAt ? "bg-white/70" : "bg-amber-50/80"
                  }`}
                >
                  <p className="font-semibold text-ink">{item.title}</p>
                  {item.body ? <p className="text-xs text-ink/60">{item.body}</p> : null}
                  <p className="text-[11px] text-ink/50">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink/60">Немає сповіщень.</p>
          )}
        </div>
      </Modal>
    </GlassPanel>
  );
}
