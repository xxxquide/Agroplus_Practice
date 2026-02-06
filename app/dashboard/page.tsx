import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { mergeProfileData } from "@/lib/profile";
import { GlassCard } from "@/components/ui/glass";
import { IconRail } from "@/components/ui/icon-rail";
import { DashboardClient } from "./_components/dashboard-client";
import Link from "next/link";
import {
  Home,
  Map as MapIcon,
  Warehouse,
  FileText,
  Users,
  Settings,
  LifeBuoy
} from "lucide-react";

export default async function DashboardPage() {
  const fields = await prisma.field.findMany({
    select: { areaHa: true, status: true, cropType: true, yieldForecastTons: true }
  });
  const reports = await prisma.report.findMany({
    take: 5,
    orderBy: { uploadedAt: "desc" },
    include: { uploadedByUser: true }
  });
  const machinery = await prisma.machinery.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" }
  });
  const fuel = await prisma.fuelPrice.findFirst({ where: { fuelType: "Diesel" } });
  const machineryUpdatedAt = machinery[0]?.updatedAt ?? new Date();
  const manualYield = await prisma.yieldForecast.findMany({
    orderBy: { createdAt: "desc" }
  });
  const sessionUser = await requireUser();
  const avatar = sessionUser ? mergeProfileData(sessionUser, sessionUser.profileData).avatar : null;

  const areaSum = fields.reduce((acc, item) => acc + item.areaHa, 0);
  const activeCount = fields.filter((item) => item.status === "ACTIVE").length;
  const plannedTasks = Math.max(8, fields.length + 4);

  const yieldMap = new Map<string, number>();
  fields.forEach((field) => {
    const current = yieldMap.get(field.cropType) ?? 0;
    yieldMap.set(field.cropType, current + field.yieldForecastTons);
  });
  const yieldData = Array.from(yieldMap.entries()).map(([name, value]) => ({
    name,
    value: Math.round(value)
  }));

  const activityReport = reports[0];

  return (
    <div className="min-h-screen bg-aurora noise-overlay">
      <div className="relative mx-auto flex max-w-[1680px] gap-6 px-8 py-10">
        <div className="relative hidden w-20 lg:block">
          <div className="fixed left-6 top-1/2 -translate-y-1/2">
            <IconRail>
              <Link
                href="/dashboard"
                aria-label="Головне меню"
                className="rounded-2xl bg-white/70 p-2 text-ink shadow-glass"
              >
                <Home size={18} />
              </Link>
              <Link
                href="/fields"
                aria-label="Карта полів"
                className="rounded-2xl bg-white/40 p-2 text-ink/60 transition hover:bg-white/60 hover:text-ink"
              >
                <MapIcon size={18} />
              </Link>
              <Link
                href="/warehouse"
                aria-label="Склад"
                className="rounded-2xl bg-white/40 p-2 text-ink/60 transition hover:bg-white/60 hover:text-ink"
              >
                <Warehouse size={18} />
              </Link>
              <Link
                href="/reports"
                aria-label="Звіти"
                className="rounded-2xl bg-white/40 p-2 text-ink/60 transition hover:bg-white/60 hover:text-ink"
              >
                <FileText size={18} />
              </Link>
              <Link
                href="/users"
                aria-label="Користувачі"
                className="rounded-2xl bg-white/40 p-2 text-ink/60 transition hover:bg-white/60 hover:text-ink"
              >
                <Users size={18} />
              </Link>
              <Link
                href="/settings"
                aria-label="Налаштування"
                className="rounded-2xl bg-white/40 p-2 text-ink/60 transition hover:bg-white/60 hover:text-ink"
              >
                <Settings size={18} />
              </Link>
              <Link
                href="/support"
                aria-label="Підтримка"
                className="rounded-2xl bg-white/40 p-2 text-ink/60 transition hover:bg-white/60 hover:text-ink"
              >
                <LifeBuoy size={18} />
              </Link>
            </IconRail>
          </div>
        </div>

        <aside className="hidden w-[260px] flex-col gap-4 xl:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Сьогодні</p>
            <div className="mt-3 space-y-3">
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Останній звіт</p>
                <p className="mt-2 text-sm font-semibold">
                  {activityReport?.fileNameOriginal ?? "Звіт готовий до завантаження"}
                </p>
                <p className="text-xs text-ink/50">Щойно</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Склад</p>
                <p className="mt-2 text-sm font-semibold">Дизель нижче порогу</p>
                <p className="text-xs text-ink/50">Рекомендовано поповнення</p>
              </GlassCard>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Вчора</p>
            <div className="mt-3 space-y-3">
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Поля</p>
                <p className="mt-2 text-sm font-semibold">Огляд 3 ділянок</p>
                <p className="text-xs text-ink/50">Звіт оновлено</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Логістика</p>
                <p className="mt-2 text-sm font-semibold">Підготовка експорту</p>
                <p className="text-xs text-ink/50">Підтверджено</p>
              </GlassCard>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <DashboardClient
            kpis={{
              areaHa: areaSum,
              activeFields: activeCount,
              plannedTasks
            }}
            reports={reports.map((report) => ({
              id: report.id,
              fileNameOriginal: report.fileNameOriginal,
              mimeType: report.mimeType,
              uploadedAt: report.uploadedAt.toISOString(),
              uploadedBy: report.uploadedByUser.name,
              category: report.category,
              downloadUrl: `/api/reports/${report.id}/file`,
              previewUrl: report.mimeType.includes("pdf")
                ? `/api/reports/${report.id}/file?inline=1`
                : undefined
            }))}
            machinery={machinery.map((item) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              status: item.status
            }))}
            machineryUpdatedAt={machineryUpdatedAt.toISOString()}
            fuelPrice={fuel?.priceUahPerL ?? null}
            fuelUpdatedAt={fuel?.updatedAt.toISOString() ?? null}
            yieldData={yieldData}
            manualYield={manualYield.map((entry) => ({
              id: entry.id,
              name: entry.cropType,
              value: entry.value,
              createdAt: entry.createdAt.toISOString()
            }))}
            avatar={avatar}
          />
        </div>
      </div>
    </div>
  );
}
