import { GlassCard } from "@/components/ui/glass";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDateTime } from "@/lib/format";

const statusMap = {
  ACTIVE: { label: "В роботі", tone: "success" as const },
  MAINTENANCE: { label: "На ремонті", tone: "warning" as const },
  OFFLINE: { label: "В простої", tone: "neutral" as const }
};

export function MachineryCard({
  items,
  updatedAt,
  actions,
  page,
  pageCount,
  onPageChange
}: {
  items: {
    id: string;
    name: string;
    type: string;
    status: "ACTIVE" | "MAINTENANCE" | "OFFLINE";
  }[];
  updatedAt: string;
  actions?: React.ReactNode;
  page?: number;
  pageCount?: number;
  onPageChange?: (page: number) => void;
}) {
  const pages = pageCount ? Array.from({ length: pageCount }, (_, idx) => idx + 1) : [];
  return (
    <GlassCard className="h-full p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {pageCount && pageCount > 1 ? (
            <div className="flex items-center gap-1 rounded-full bg-white/60 px-2 py-1">
              {pages.map((value) => (
                <button
                  key={value}
                  onClick={() => onPageChange?.(value)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition ${
                    value === page
                      ? "bg-brand text-white shadow-sm"
                      : "text-ink/60 hover:bg-white/80 hover:text-ink"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}
          <h3 className="text-sm font-semibold">Статус техніки</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <span className="text-xs text-ink/50">Оновлено: {formatDateTime(updatedAt)}</span>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl bg-white/60 px-4 py-6 text-center text-sm text-ink/60">
            Дані про техніку відсутні.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-ink/50">{item.type}</p>
              </div>
              <StatusPill
                label={statusMap[item.status].label}
                tone={statusMap[item.status].tone}
              />
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}
