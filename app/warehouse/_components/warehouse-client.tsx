"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { z } from "zod";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable
} from "@tanstack/react-table";
import {
  Home,
  Map as MapIcon,
  Warehouse,
  FileText,
  Users,
  Settings,
  LifeBuoy,
  Plus,
  FileSpreadsheet,
  MoreVertical,
  Pencil,
  MinusCircle,
  History,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { IconRail } from "@/components/ui/icon-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { FloatingDock } from "@/components/ui/floating-dock";
import { formatDateTime } from "@/lib/format";
import {
  computeInventoryStatus,
  estimateUnitValue,
  formatNumber,
  inventoryStatusLabel,
  inventoryStatusTone
} from "@/lib/inventory";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  responsible: string;
  status: "ENOUGH" | "LOW" | "CRITICAL";
  minThreshold: number;
  updatedAt: string;
};

type ConsumeLog = {
  id: string;
  name: string;
  amount: number;
  reason: string | null;
  createdAt: string;
};

type InventoryLog = {
  id: string;
  type: "CREATE" | "UPDATE" | "CONSUME";
  amount: number | null;
  reason: string | null;
  createdAt: string;
};

type InventoryFormState = {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  responsible: string;
  minThreshold: string;
};

type ConsumeFormState = {
  amount: string;
  reason: string;
};

const inventorySchema = z.object({
  name: z.string().min(2, "Вкажіть назву"),
  category: z.string().min(2, "Вкажіть категорію"),
  quantity: z.coerce.number().min(0, "Кількість не може бути від'ємною"),
  unit: z.string().min(1, "Вкажіть одиницю"),
  responsible: z.string().min(2, "Вкажіть відповідального"),
  minThreshold: z.coerce.number().min(0, "Вкажіть мінімум")
});

const consumeSchema = z.object({
  amount: z.coerce.number().positive("Сума списання має бути більшою нуля"),
  reason: z.string().min(2, "Додайте причину")
});

const defaultForm: InventoryFormState = {
  name: "",
  category: "",
  quantity: "",
  unit: "",
  responsible: "",
  minThreshold: ""
};

const defaultConsume: ConsumeFormState = {
  amount: "",
  reason: ""
};

export function WarehouseClient({
  initialItems,
  recentConsumes
}: {
  initialItems: InventoryItem[];
  recentConsumes: ConsumeLog[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = React.useState<InventoryItem[]>(initialItems);
  const [recentConsumeState, setRecentConsumeState] =
    React.useState<ConsumeLog[]>(recentConsumes);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [unitFilter, setUnitFilter] = React.useState("all");
  const [responsibleFilter, setResponsibleFilter] = React.useState("all");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 8 });
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  const [addOpen, setAddOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<InventoryItem | null>(null);
  const [consumeItem, setConsumeItem] = React.useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = React.useState<InventoryItem | null>(null);
  const [historyLogs, setHistoryLogs] = React.useState<InventoryLog[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const [formState, setFormState] = React.useState<InventoryFormState>(defaultForm);
  const [consumeState, setConsumeState] = React.useState<ConsumeFormState>(defaultConsume);

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-menu-root]")) return;
      setMenuOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  React.useEffect(() => {
    setRecentConsumeState(recentConsumes);
  }, [recentConsumes]);

  React.useEffect(() => {
    if (searchParams?.get("add") === "1") {
      openAddModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const categories = React.useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.category)))],
    [items]
  );
  const units = React.useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.unit)))],
    [items]
  );
  const responsibles = React.useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.responsible)))],
    [items]
  );

  const filteredItems = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesUnit = unitFilter === "all" || item.unit === unitFilter;
      const matchesResponsible =
        responsibleFilter === "all" || item.responsible === responsibleFilter;
      return matchesQuery && matchesCategory && matchesUnit && matchesResponsible;
    });
  }, [items, search, categoryFilter, unitFilter, responsibleFilter]);

  const columns = React.useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Назва ресурсу",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-ink">{row.original.name}</p>
            <p className="text-xs text-ink/50">{row.original.category}</p>
          </div>
        )
      },
      {
        accessorKey: "quantity",
        header: "Кількість на складі",
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {formatNumber(row.original.quantity)}
          </span>
        )
      },
      {
        accessorKey: "unit",
        header: "Одиниця виміру",
        cell: ({ row }) => <span className="text-sm">{row.original.unit}</span>
      },
      {
        accessorKey: "responsible",
        header: "Відповідальний",
        cell: ({ row }) => <span className="text-sm">{row.original.responsible}</span>
      },
      {
        accessorKey: "updatedAt",
        header: "Оновлено",
        cell: ({ row }) => (
          <span className="text-xs text-ink/60">{formatDateTime(row.original.updatedAt)}</span>
        )
      },
      {
        accessorKey: "status",
        header: "Статус",
        cell: ({ row }) => {
          const status = computeInventoryStatus(row.original.quantity, row.original.minThreshold);
          return (
            <StatusPill
              label={inventoryStatusLabel[status]}
              tone={inventoryStatusTone[status]}
            />
          );
        }
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="relative" data-menu-root>
            <button
              className="rounded-full p-2 text-ink/60 transition hover:bg-white/70 hover:text-ink"
              onClick={() =>
                setMenuOpenId((prev) => (prev === row.original.id ? null : row.original.id))
              }
            >
              <MoreVertical size={16} />
            </button>
            {menuOpenId === row.original.id && (
              <div className="absolute right-0 top-9 z-20 w-40 rounded-2xl border border-white/60 bg-white/90 p-2 text-sm shadow-glass backdrop-blur-xl">
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-ink/70 hover:bg-white/70"
                  onClick={() => {
                    setEditItem(row.original);
                    setFormState({
                      name: row.original.name,
                      category: row.original.category,
                      quantity: row.original.quantity.toString(),
                      unit: row.original.unit,
                      responsible: row.original.responsible,
                      minThreshold: row.original.minThreshold.toString()
                    });
                    setMenuOpenId(null);
                  }}
                >
                  <Pencil size={14} /> Редагувати
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-ink/70 hover:bg-white/70"
                  onClick={() => {
                    setConsumeItem(row.original);
                    setConsumeState(defaultConsume);
                    setMenuOpenId(null);
                  }}
                >
                  <MinusCircle size={14} /> Списати
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-ink/70 hover:bg-white/70"
                  onClick={() => {
                    setHistoryItem(row.original);
                    setMenuOpenId(null);
                  }}
                >
                  <History size={14} /> Історія
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-ink/70 hover:bg-white/70"
                  onClick={() => handleDelete(row.original)}
                >
                  <Trash2 size={14} /> Видалити
                </button>
              </div>
            )}
          </div>
        )
      }
    ],
    [menuOpenId]
  );

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const lowStockItems = React.useMemo(() => {
    return items
      .map((item) => ({
        ...item,
        statusValue: computeInventoryStatus(item.quantity, item.minThreshold)
      }))
      .filter((item) => item.statusValue !== "ENOUGH")
      .slice(0, 3);
  }, [items]);

  const criticalCount = React.useMemo(() => {
    return items.filter(
      (item) => computeInventoryStatus(item.quantity, item.minThreshold) === "CRITICAL"
    ).length;
  }, [items]);

  const totalValue = React.useMemo(() => {
    const sum = items.reduce((acc, item) => {
      return acc + item.quantity * estimateUnitValue(item.unit, item.category);
    }, 0);
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: "UAH",
      maximumFractionDigits: 0
    }).format(sum);
  }, [items]);

  const recentIncoming = React.useMemo(() => {
    return [...items]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [items]);

  const openAddModal = () => {
    setFormState(defaultForm);
    setAddOpen(true);
  };

  const refreshInventory = async () => {
    setRefreshing(true);
    try {
      const [itemsResponse, logsResponse] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/inventory/logs?type=CONSUME&take=4")
      ]);
      if (!itemsResponse.ok || !logsResponse.ok) throw new Error();
      const itemsData = await itemsResponse.json();
      const logsData = await logsResponse.json();
      setItems(itemsData.items ?? []);
      setRecentConsumeState(logsData.logs ?? []);
      toast.success("Дані оновлено");
    } catch {
      toast.error("Не вдалося оновити дані");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveNew = async () => {
    const parsed = inventorySchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Перевірте дані");
      return;
    }
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems((prev) => [data.item, ...prev]);
      setAddOpen(false);
      toast.success("Ресурс додано");
    } catch {
      toast.error("Не вдалося додати ресурс");
    }
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    const parsed = inventorySchema.safeParse(formState);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Перевірте дані");
      return;
    }
    try {
      const response = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editItem.id, ...parsed.data })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems((prev) => prev.map((item) => (item.id === data.item.id ? data.item : item)));
      setEditItem(null);
      toast.success("Ресурс оновлено");
    } catch {
      toast.error("Не вдалося оновити ресурс");
    }
  };

  const handleConsume = async () => {
    if (!consumeItem) return;
    const parsed = consumeSchema.safeParse(consumeState);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Перевірте дані");
      return;
    }
    try {
      const response = await fetch("/api/inventory/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: consumeItem.id, ...parsed.data })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems((prev) => prev.map((item) => (item.id === data.item.id ? data.item : item)));
      setRecentConsumeState((prev) => [
        {
          id: `local-${Date.now()}`,
          name: consumeItem.name,
          amount: parsed.data.amount,
          reason: parsed.data.reason ?? null,
          createdAt: new Date().toISOString()
        },
        ...prev
      ].slice(0, 4));
      setConsumeItem(null);
      toast.success("Списання виконано");
    } catch {
      toast.error("Не вдалося списати ресурс");
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!window.confirm(`Видалити ресурс “${item.name}”?`)) return;
    try {
      const response = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id })
      });
      if (!response.ok) throw new Error();
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      toast.success("Ресурс видалено");
    } catch {
      toast.error("Не вдалося видалити ресурс");
    }
  };

  const handleExport = () => {
    const rows = filteredItems.map((item) => {
      const status = computeInventoryStatus(item.quantity, item.minThreshold);
      return {
        "Назва ресурсу": item.name,
        Категорія: item.category,
        "Кількість на складі": item.quantity,
        "Одиниця виміру": item.unit,
        Відповідальний: item.responsible,
        Оновлено: formatDateTime(item.updatedAt),
        Статус: inventoryStatusLabel[status]
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Warehouse");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(workbook, `warehouse-export-${stamp}.xlsx`);
    toast.success("Експортовано успішно");
  };

  React.useEffect(() => {
    if (!historyItem) return;
    const load = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch(`/api/inventory/history?itemId=${historyItem.id}`);
        const data = await response.json();
        setHistoryLogs(data.logs ?? []);
      } catch {
        setHistoryLogs([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, [historyItem]);

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
                className="rounded-2xl bg-white/70 p-2 text-ink shadow-glass"
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
              {lowStockItems.length ? (
                lowStockItems.map((item) => (
                  <GlassCard key={item.id} className="p-4">
                    <p className="text-xs text-ink/60">Низький запас</p>
                    <p className="mt-2 text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-ink/50">
                      {formatNumber(item.quantity)} {item.unit}
                    </p>
                  </GlassCard>
                ))
              ) : (
                <GlassCard className="p-4">
                  <p className="text-xs text-ink/60">Запаси стабільні</p>
                  <p className="mt-2 text-sm font-semibold">Критичних позицій немає</p>
                  <p className="text-xs text-ink/50">Оновлено щойно</p>
                </GlassCard>
              )}
            </div>
          </div>
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Останні дії</p>
            <div className="mt-3 space-y-3">
              {recentConsumeState.length ? (
                recentConsumeState.map((log) => (
                  <GlassCard key={log.id} className="p-4">
                    <p className="text-xs text-ink/60">Списання</p>
                    <p className="mt-2 text-sm font-semibold">{log.name}</p>
                    <p className="text-xs text-ink/50">
                      -{formatNumber(log.amount)} • {formatDateTime(log.createdAt)}
                    </p>
                  </GlassCard>
                ))
              ) : (
                <GlassCard className="p-4">
                  <p className="text-xs text-ink/60">Історія</p>
                  <p className="mt-2 text-sm font-semibold">Списань поки не було</p>
                  <p className="text-xs text-ink/50">Дані за останні 7 днів</p>
                </GlassCard>
              )}
            </div>
          </div>
        </aside>

        <GlassPanel className="flex-1 rounded-[32px] p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Склад / Warehouse</p>
              <h1 className="text-2xl font-semibold">Складський облік</h1>
            </div>
          </div>

          <GlassCard className="mt-6 flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-[200px] flex-1">
              <Input
                placeholder="Пошук ресурсу…"
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
              value={unitFilter}
              onChange={(event) => setUnitFilter(event.target.value)}
            >
              {units.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Одиниця" : option}
                </option>
              ))}
            </select>
            <select
              className="input-surface h-11 rounded-input px-4 text-sm"
              value={responsibleFilter}
              onChange={(event) => setResponsibleFilter(event.target.value)}
            >
              {responsibles.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Відповідальний" : option}
                </option>
              ))}
            </select>
            <Button className="whitespace-nowrap" onClick={openAddModal}>
              <Plus size={16} /> Додати ресурс
            </Button>
            <Button variant="outline" className="whitespace-nowrap" onClick={handleExport}>
              <FileSpreadsheet size={16} /> Експорт (Excel)
            </Button>
          </GlassCard>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <GlassCard className="flex flex-col overflow-hidden p-0">
              <div className="max-h-[520px] overflow-auto">
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
                    {table.getRowModel().rows.map((row) => {
                      const status = computeInventoryStatus(
                        row.original.quantity,
                        row.original.minThreshold
                      );
                      const rowTone =
                        status === "CRITICAL"
                          ? "bg-rose-50/60"
                          : status === "LOW"
                          ? "bg-amber-50/60"
                          : "bg-white/50";
                      return (
                        <tr
                          key={row.id}
                          className={`${rowTone} transition hover:bg-white/80`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="border-b border-white/60 px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
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
                    className="rounded-full p-2 text-ink/60 hover:bg-white/70"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="rounded-full p-2 text-ink/60 hover:bg-white/70"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-4">
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                  Критичні позиції
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink">{criticalCount}</p>
                <p className="text-xs text-ink/50">Потрібне поповнення найближчим часом</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                  Загальна вартість запасів
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink">{totalValue}</p>
                <p className="text-xs text-ink/50">Оцінка за категоріями</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                  Останні надходження
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {recentIncoming.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span>{item.name}</span>
                      <span className="text-ink/50">
                        +{formatNumber(item.quantity)} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                  Останні списання
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {recentConsumeState.length ? (
                    recentConsumeState.map((log) => (
                      <div key={log.id} className="flex items-center justify-between">
                        <span>{log.name}</span>
                        <span className="text-ink/50">
                          -{formatNumber(log.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-ink/50">Списань поки не було</p>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>

          <FloatingDock className="mt-8">
            <Button size="sm" onClick={openAddModal}>
              <Plus size={14} /> Додати ресурс
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <FileSpreadsheet size={14} /> Експорт
            </Button>
            <Button size="sm" variant="ghost" onClick={refreshInventory} disabled={refreshing}>
              Оновити дані
            </Button>
            <Button size="sm" variant="ghost" onClick={() => router.push("/support")}>
              Підтримка
            </Button>
          </FloatingDock>
        </GlassPanel>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Додати ресурс">
        <div className="space-y-3">
          <FieldInput
            label="Назва ресурсу"
            placeholder="Селітра"
            value={formState.name}
            onChange={(value) => setFormState((prev) => ({ ...prev, name: value }))}
          />
          <FieldInput
            label="Категорія"
            placeholder="Добрива"
            value={formState.category}
            onChange={(value) => setFormState((prev) => ({ ...prev, category: value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Кількість"
              type="number"
              placeholder="40"
              value={formState.quantity}
              onChange={(value) => setFormState((prev) => ({ ...prev, quantity: value }))}
            />
            <FieldInput
              label="Одиниця"
              placeholder="т"
              value={formState.unit}
              onChange={(value) => setFormState((prev) => ({ ...prev, unit: value }))}
            />
          </div>
          <FieldInput
            label="Відповідальний"
            placeholder="Іваненко О."
            value={formState.responsible}
            onChange={(value) => setFormState((prev) => ({ ...prev, responsible: value }))}
          />
          <FieldInput
            label="Мінімальний поріг"
            type="number"
            placeholder="30"
            value={formState.minThreshold}
            onChange={(value) => setFormState((prev) => ({ ...prev, minThreshold: value }))}
          />
          <Button className="w-full" onClick={handleSaveNew}>
            Зберегти
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(editItem)}
        onClose={() => setEditItem(null)}
        title="Редагувати ресурс"
      >
        <div className="space-y-3">
          <FieldInput
            label="Назва ресурсу"
            value={formState.name}
            onChange={(value) => setFormState((prev) => ({ ...prev, name: value }))}
          />
          <FieldInput
            label="Категорія"
            value={formState.category}
            onChange={(value) => setFormState((prev) => ({ ...prev, category: value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Кількість"
              type="number"
              value={formState.quantity}
              onChange={(value) => setFormState((prev) => ({ ...prev, quantity: value }))}
            />
            <FieldInput
              label="Одиниця"
              value={formState.unit}
              onChange={(value) => setFormState((prev) => ({ ...prev, unit: value }))}
            />
          </div>
          <FieldInput
            label="Відповідальний"
            value={formState.responsible}
            onChange={(value) => setFormState((prev) => ({ ...prev, responsible: value }))}
          />
          <FieldInput
            label="Мінімальний поріг"
            type="number"
            value={formState.minThreshold}
            onChange={(value) => setFormState((prev) => ({ ...prev, minThreshold: value }))}
          />
          <Button className="w-full" onClick={handleSaveEdit}>
            Оновити
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(consumeItem)}
        onClose={() => setConsumeItem(null)}
        title="Списати ресурс"
      >
        <div className="space-y-3">
          <p className="text-sm text-ink/70">
            Ресурс: <span className="font-semibold">{consumeItem?.name}</span>
          </p>
          <FieldInput
            label="Списати кількість"
            type="number"
            placeholder="10"
            value={consumeState.amount}
            onChange={(value) => setConsumeState((prev) => ({ ...prev, amount: value }))}
          />
          <FieldInput
            label="Причина"
            placeholder="Виробничі роботи"
            value={consumeState.reason}
            onChange={(value) => setConsumeState((prev) => ({ ...prev, reason: value }))}
          />
          <Button className="w-full" onClick={handleConsume}>
            Підтвердити
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(historyItem)}
        onClose={() => setHistoryItem(null)}
        title="Історія змін"
      >
        <div className="space-y-3 text-sm text-ink/70">
          {historyLoading ? (
            <p>Завантаження...</p>
          ) : historyLogs.length ? (
            historyLogs.map((log) => (
              <div key={log.id} className="rounded-xl bg-white/70 px-3 py-2">
                <p className="font-medium text-ink">
                  {log.type === "CREATE"
                    ? "Створено"
                    : log.type === "UPDATE"
                    ? "Оновлено"
                    : "Списано"}
                </p>
                <p className="text-xs text-ink/50">
                  {formatDateTime(log.createdAt)}
                  {log.amount ? ` • -${formatNumber(log.amount)}` : ""}
                </p>
                {log.reason ? <p className="text-xs text-ink/50">{log.reason}</p> : null}
              </div>
            ))
          ) : (
            <p>Поки немає записів.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="text-xs text-ink/60">
      {label}
      <Input
        className="mt-2"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
