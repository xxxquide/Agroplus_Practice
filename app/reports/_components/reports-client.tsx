"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  FileSpreadsheet,
  Upload,
  Plus,
  Search,
  ArrowUpDown,
  Eye,
  Download,
  Home,
  Map as MapIcon,
  Warehouse,
  Users,
  Settings,
  LifeBuoy
} from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from "@tanstack/react-table";
import { toast } from "sonner";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { IconRail } from "@/components/ui/icon-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatingDock } from "@/components/ui/floating-dock";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/format";
import { UploadReportModal } from "@/app/dashboard/_components/upload-report-modal";
import { LocalReportModal } from "@/app/dashboard/_components/local-report-modal";
import type { ReportItem } from "@/app/dashboard/_components/reports-card";

type ReportRow = ReportItem & {
  tags?: string;
  description?: string | null;
  sizeBytes?: number;
};

const STORAGE_KEYS = {
  reports: "agroplus.localReports"
};

const formatSize = (bytes?: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const reportTypeLabel = (mime: string) =>
  mime.includes("pdf") ? "PDF" : mime.includes("spreadsheet") ? "XLSX" : "Файл";

const reportTypeTone = (mime: string) =>
  mime.includes("pdf") ? "text-[#b45309] bg-[#FEF3C7]" : "text-[#0f766e] bg-[#CCFBF1]";

export function ReportsClient({ initialReports }: { initialReports: ReportRow[] }) {
  const router = useRouter();
  const [serverReports, setServerReports] = React.useState<ReportRow[]>(initialReports);
  const [localReports, setLocalReports] = React.useState<ReportRow[]>([]);
  const [localReady, setLocalReady] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "uploadedAt", desc: true }
  ]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 6 });
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [authorFilter, setAuthorFilter] = React.useState("all");
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [localOpen, setLocalOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<ReportRow | null>(null);

  React.useEffect(() => {
    setServerReports(initialReports);
  }, [initialReports]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEYS.reports);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ReportRow[];
        setLocalReports(parsed);
      } catch {
        setLocalReports([]);
      }
    }
    setLocalReady(true);
  }, []);

  React.useEffect(() => {
    if (!localReady) return;
    localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(localReports));
  }, [localReports, localReady]);

  const mergedReports = React.useMemo(() => {
    const all = [...localReports, ...serverReports];
    return all.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [localReports, serverReports]);

  const categories = React.useMemo(
    () => ["all", ...Array.from(new Set(mergedReports.map((item) => item.category)))],
    [mergedReports]
  );
  const authors = React.useMemo(
    () => ["all", ...Array.from(new Set(mergedReports.map((item) => item.uploadedBy)))],
    [mergedReports]
  );

  const filteredReports = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return mergedReports.filter((item) => {
      const matchesQuery =
        !query ||
        item.fileNameOriginal.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.tags ?? "").toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "pdf" && item.mimeType.includes("pdf")) ||
        (typeFilter === "xlsx" && item.mimeType.includes("spreadsheet"));
      const matchesAuthor = authorFilter === "all" || item.uploadedBy === authorFilter;
      return matchesQuery && matchesCategory && matchesType && matchesAuthor;
    });
  }, [mergedReports, search, categoryFilter, typeFilter, authorFilter]);

  const columns = React.useMemo<ColumnDef<ReportRow>[]>(
    () => [
      {
        accessorKey: "fileNameOriginal",
        header: "Назва",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {row.original.fileNameOriginal}
            </p>
            <p className="text-xs text-ink/50">
              {row.original.category}
              {row.original.description ? ` • ${row.original.description}` : ""}
            </p>
          </div>
        )
      },
      {
        accessorKey: "type",
        header: "Тип",
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${reportTypeTone(
              row.original.mimeType
            )}`}
          >
            {reportTypeLabel(row.original.mimeType)}
          </span>
        )
      },
      {
        accessorKey: "tags",
        header: "Теги",
        cell: ({ row }) => {
          const tags = (row.original.tags ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 3);
          return tags.length ? (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/70 px-2 py-0.5 text-[11px]">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-ink/40">—</span>
          );
        }
      },
      {
        accessorKey: "uploadedBy",
        header: "Автор",
        cell: ({ row }) => <span className="text-sm">{row.original.uploadedBy}</span>
      },
      {
        accessorKey: "uploadedAt",
        header: "Оновлено",
        cell: ({ row }) => (
          <span className="text-xs text-ink/50">{formatDateTime(row.original.uploadedAt)}</span>
        )
      },
      {
        accessorKey: "sizeBytes",
        header: "Розмір",
        cell: ({ row }) => <span className="text-xs text-ink/50">{formatSize(row.original.sizeBytes)}</span>
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreview(row.original)}
              disabled={!row.original.previewUrl}
            >
              <Eye size={14} />
            </Button>
            {row.original.downloadUrl ? (
              <a
                className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-ink/80 transition hover:bg-white"
                href={row.original.downloadUrl}
              >
                <Download size={14} /> Завантажити
              </a>
            ) : (
              <span className="rounded-full border border-white/30 bg-white/40 px-3 py-1 text-xs text-ink/40">
                Локальний
              </span>
            )}
          </div>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: filteredReports,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const totals = React.useMemo(() => {
    const total = mergedReports.length;
    const pdf = mergedReports.filter((item) => item.mimeType.includes("pdf")).length;
    const xlsx = mergedReports.filter((item) => item.mimeType.includes("spreadsheet")).length;
    return { total, pdf, xlsx };
  }, [mergedReports]);

  const latest = mergedReports.slice(0, 3);

  const handleLocalAdd = (report: ReportItem) => {
    setLocalReports((prev) => [{ ...report, tags: "локально" }, ...prev]);
  };

  const handleUploaded = (report: ReportItem) => {
    setServerReports((prev) => [
      {
        ...report,
        tags: "новий",
        description: "Завантажено з панелі"
      },
      ...prev
    ]);
  };

  return (
    <div className="min-h-screen bg-aurora noise-overlay">
      <div className="relative mx-auto flex max-w-[1680px] gap-6 px-8 py-10">
        <div className="relative hidden w-20 lg:block">
          <div className="fixed left-6 top-1/2 -translate-y-1/2">
            <IconRail>
              <Link
                href="/dashboard"
                aria-label="Головне меню"
                className="rounded-2xl bg-white/40 p-2 text-ink/60 transition hover:bg-white/60 hover:text-ink"
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
                className="rounded-2xl bg-white/70 p-2 text-ink shadow-glass"
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
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Останні дії</p>
            <div className="mt-3 space-y-3">
              {latest.length ? (
                latest.map((report) => (
                  <GlassCard key={report.id} className="p-4">
                    <p className="text-xs text-ink/60">{report.category}</p>
                    <p className="mt-2 text-sm font-semibold">{report.fileNameOriginal}</p>
                    <p className="text-xs text-ink/50">{formatDateTime(report.uploadedAt)}</p>
                  </GlassCard>
                ))
              ) : (
                <GlassCard className="p-4">
                  <p className="text-xs text-ink/60">Поки немає звітів</p>
                  <p className="mt-2 text-sm font-semibold">Завантажте перший файл</p>
                </GlassCard>
              )}
            </div>
          </div>
        </aside>

        <GlassPanel className="flex-1 rounded-[32px] p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Звіти / Reports</p>
              <h1 className="text-2xl font-semibold">Звіти та документи</h1>
            </div>
          </div>

          <GlassCard className="mt-6 flex flex-wrap items-center gap-3 p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <Input
                className="pl-9"
                placeholder="Пошук звіту…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              className="input-surface h-11 rounded-input px-4 text-sm"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Категорія" : option}
                </option>
              ))}
            </select>
            <select
              className="input-surface h-11 rounded-input px-4 text-sm"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Тип</option>
              <option value="pdf">PDF</option>
              <option value="xlsx">XLSX</option>
            </select>
            <select
              className="input-surface h-11 rounded-input px-4 text-sm"
              value={authorFilter}
              onChange={(event) => setAuthorFilter(event.target.value)}
            >
              {authors.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Відповідальний" : option}
                </option>
              ))}
            </select>
            <Button className="whitespace-nowrap" onClick={() => setUploadOpen(true)}>
              <Upload size={16} /> Завантажити
            </Button>
            <Button variant="outline" className="whitespace-nowrap" onClick={() => setLocalOpen(true)}>
              <Plus size={16} /> Локальний
            </Button>
          </GlassCard>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <GlassCard className="flex flex-col overflow-hidden p-0">
              <div className="max-h-[540px] overflow-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60"
                          >
                            {header.isPlaceholder ? null : header.column.getCanSort() ? (
                              <button
                                className="flex items-center gap-2"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                <ArrowUpDown size={14} className="text-ink/40" />
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="bg-white/50 transition hover:bg-white/80">
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="border-b border-white/60 px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-8 text-center text-sm text-ink/60" colSpan={7}>
                          Немає звітів за заданими фільтрами.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm text-ink/60">
                <span>
                  Сторінка {table.getState().pagination.pageIndex + 1} з{" "}
                  {table.getPageCount()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-ink/70"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Назад
                  </button>
                  <button
                    className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-ink/70"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Далі
                  </button>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-4">
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Всього звітів</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{totals.total}</p>
                <p className="text-xs text-ink/50">Останнє оновлення {latest[0] ? formatDateTime(latest[0].uploadedAt) : "—"}</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Формати</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText size={14} /> PDF
                    </span>
                    <span className="text-ink/60">{totals.pdf}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet size={14} /> XLSX
                    </span>
                    <span className="text-ink/60">{totals.xlsx}</span>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Категорії</p>
                <div className="mt-3 space-y-2 text-sm">
                  {categories.filter((item) => item !== "all").slice(0, 4).map((cat) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span>{cat}</span>
                      <span className="text-ink/50">
                        {mergedReports.filter((report) => report.category === cat).length}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Швидкі дії</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                    <Upload size={14} /> Завантажити
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setLocalOpen(true)}>
                    <Plus size={14} /> Локальний
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>

          <FloatingDock className="mt-8">
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload size={14} /> Завантажити
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLocalOpen(true)}>
              <Plus size={14} /> Локальний
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                router.refresh();
                toast.message("Дані оновлено");
              }}
            >
              Оновити
            </Button>
          </FloatingDock>
        </GlassPanel>
      </div>

      <UploadReportModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />
      <LocalReportModal open={localOpen} onClose={() => setLocalOpen(false)} onAdd={handleLocalAdd} />

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.fileNameOriginal}
        className="max-w-4xl"
      >
        {preview?.previewUrl ? (
          <iframe className="h-[75vh] w-full rounded-xl" src={preview.previewUrl} />
        ) : (
          <p className="text-sm text-ink/60">Перегляд доступний лише для PDF.</p>
        )}
      </Modal>
    </div>
  );
}
