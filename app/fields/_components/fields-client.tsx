"use client";

import * as React from "react";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import {
  Home,
  Map as MapIcon,
  Warehouse,
  FileText,
  Users,
  Settings,
  LifeBuoy,
  Plus,
  Upload,
  X
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { IconRail } from "@/components/ui/icon-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FieldsMap } from "./fields-map";
import { formatDate } from "@/lib/format";
import Link from "next/link";

export type FieldItem = {
  id: string;
  code: string;
  name: string;
  region: string;
  district: string;
  cropType: string;
  status: "ACTIVE" | "DORMANT" | "HARVEST";
  areaHa: number;
  sowingDate: string | null;
  yieldForecastTons: number;
  soilMoisturePct: number;
  lastInspectionAt: string | null;
  geometryGeoJSON: string;
  tasks: {
    id: string;
    title: string;
    status: "OPEN" | "IN_PROGRESS" | "DONE";
    createdAt: string;
  }[];
};

type MachineryItem = {
  id: string;
  name: string;
  type: string;
  status: string;
};

type ReportItem = {
  id: string;
  fileNameOriginal: string;
  tags: string;
  uploadedAt: string;
  uploadedBy: string;
};

type AddFieldState = {
  code: string;
  name: string;
  cropType: string;
  status: FieldItem["status"];
  district: string;
  areaHa: string;
  yieldForecastTons: string;
  soilMoisturePct: string;
  sowingDate: string;
  lastInspectionAt: string;
};

const cropSeeds = [
  "Пшениця",
  "Ячмінь",
  "Кукурудза",
  "Соя",
  "Овес",
  "Соняшник",
  "Гречка",
  "Жито"
];
const districtSeeds = [
  "Вінницький",
  "Гайсинський",
  "Жмеринський",
  "Могилів-Подільський",
  "Хмільницький"
];

const taskStatusLabel: Record<FieldItem["tasks"][number]["status"], string> = {
  OPEN: "Нова",
  IN_PROGRESS: "В роботі",
  DONE: "Готово"
};

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const randomBetween = (min: number, max: number, decimals = 0) => {
  const value = Math.random() * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const createDefaultAddField = (): AddFieldState => {
  const areaHa = randomBetween(45, 220, 1);
  const yieldForecastTons = Math.max(
    20,
    Math.round(areaHa * randomBetween(0.6, 1.4, 2))
  );
  const soilMoisturePct = randomBetween(18, 34, 0);
  const now = new Date();
  const sowing = new Date(now.getFullYear(), Math.random() < 0.5 ? 8 : 3, 1);
  sowing.setDate(sowing.getDate() + Math.floor(randomBetween(0, 28, 0)));
  const lastInspection = new Date();
  lastInspection.setDate(lastInspection.getDate() - Math.floor(randomBetween(1, 12, 0)));

  return {
    code: "",
    name: "",
    cropType: cropSeeds[Math.floor(Math.random() * cropSeeds.length)],
    status: "ACTIVE",
    district: districtSeeds[Math.floor(Math.random() * districtSeeds.length)],
    areaHa: areaHa.toString(),
    yieldForecastTons: yieldForecastTons.toString(),
    soilMoisturePct: soilMoisturePct.toString(),
    sowingDate: toInputDate(sowing),
    lastInspectionAt: toInputDate(lastInspection)
  };
};

const normalizePolygon = (geometry: unknown): Geometry | null => {
  if (!geometry || typeof geometry !== "object") return null;
  const candidate = geometry as { type?: string; coordinates?: unknown };
  if (candidate.type !== "Polygon" && candidate.type !== "MultiPolygon") return null;

  const toNumberPair = (pair: unknown): [number, number] | null => {
    if (!Array.isArray(pair) || pair.length < 2) return null;
    const x = Number(pair[0]);
    const y = Number(pair[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return [x, y];
  };

  const normalizeRing = (ring: unknown): [number, number][] | null => {
    if (!Array.isArray(ring)) return null;
    const coords = ring
      .map(toNumberPair)
      .filter((item): item is [number, number] => Boolean(item));
    return coords.length >= 4 ? coords : null;
  };

  if (candidate.type === "Polygon") {
    const rings = (Array.isArray(candidate.coordinates) ? candidate.coordinates : [])
      .map(normalizeRing)
      .filter((ring): ring is [number, number][] => Boolean(ring));
    if (!rings.length) return null;
    return { type: "Polygon", coordinates: rings };
  }

  const polygons = (Array.isArray(candidate.coordinates) ? candidate.coordinates : [])
    .map((poly) =>
      Array.isArray(poly)
        ? poly
          .map(normalizeRing)
          .filter((ring): ring is [number, number][] => Boolean(ring))
        : null
    )
    .filter((poly): poly is [number, number][][] => poly !== null && poly.length > 0);
  if (!polygons.length) return null;
  return { type: "MultiPolygon", coordinates: polygons };
};

export function FieldsClient({
  initialFields,
  machinery,
  reports
}: {
  initialFields: FieldItem[];
  machinery: MachineryItem[];
  reports: ReportItem[];
}) {
  const [fields, setFields] = React.useState<FieldItem[]>(initialFields);
  const [query, setQuery] = React.useState("");
  const [cropFilter, setCropFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [districtFilter, setDistrictFilter] = React.useState("all");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [showMachinery, setShowMachinery] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState(1);
  const [drawMode, setDrawMode] = React.useState(false);
  const [newPolygon, setNewPolygon] = React.useState<Geometry | null>(null);
  const newPolygonRef = React.useRef<Geometry | null>(null);
  const [addField, setAddField] = React.useState<AddFieldState>(createDefaultAddField);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [reportsOpen, setReportsOpen] = React.useState(false);

  const cropOptions = React.useMemo(() => {
    const set = new Set(fields.map((field) => field.cropType));
    return ["all", ...Array.from(set)];
  }, [fields]);
  const districtOptions = React.useMemo(() => {
    const set = new Set(fields.map((field) => field.district));
    return ["all", ...Array.from(set)];
  }, [fields]);
  const yearOptions = React.useMemo(() => {
    const set = new Set(
      fields
        .map((field) => field.sowingDate)
        .filter(Boolean)
        .map((date) => new Date(date as string).getFullYear().toString())
    );
    return ["all", ...Array.from(set)];
  }, [fields]);

  const filteredFields = React.useMemo(() => {
    return fields.filter((field) => {
      const matchesQuery =
        !query ||
        field.code.toLowerCase().includes(query.toLowerCase()) ||
        field.name.toLowerCase().includes(query.toLowerCase());
      const matchesCrop = cropFilter === "all" || field.cropType === cropFilter;
      const matchesStatus = statusFilter === "all" || field.status === statusFilter;
      const matchesDistrict = districtFilter === "all" || field.district === districtFilter;
      const matchesYear =
        yearFilter === "all" ||
        (field.sowingDate && new Date(field.sowingDate).getFullYear().toString() === yearFilter);
      return matchesQuery && matchesCrop && matchesStatus && matchesDistrict && matchesYear;
    });
  }, [fields, query, cropFilter, statusFilter, districtFilter, yearFilter]);

  const featureCollection = React.useMemo<FeatureCollection<Geometry, GeoJsonProperties>>(() => {
    const features = filteredFields
      .map((field) => {
        try {
          const geometry = normalizePolygon(JSON.parse(field.geometryGeoJSON));
          if (!geometry) return null;
          const feature: Feature<Geometry, GeoJsonProperties> = {
            type: "Feature",
            id: field.id,
            properties: {
              id: field.id,
              code: field.code,
              name: field.name,
              cropType: field.cropType,
              status: field.status,
              sowingDate: field.sowingDate,
              yieldForecastTons: field.yieldForecastTons,
              areaHa: field.areaHa,
              soilMoisturePct: field.soilMoisturePct,
              lastInspectionAt: field.lastInspectionAt
            },
            geometry
          };
          return feature;
        } catch {
          return null;
        }
      })
      .filter((feature): feature is Feature<Geometry, GeoJsonProperties> => Boolean(feature));
    return { type: "FeatureCollection", features };
  }, [filteredFields]);

  type PointGeometry = { type: "Point"; coordinates: [number, number] };
  const machineryPoints = React.useMemo<FeatureCollection<PointGeometry, GeoJsonProperties>>(() => {
    const points = machinery.map((item, idx) => {
      const baseField = filteredFields[idx % Math.max(filteredFields.length, 1)];
      let coords: [number, number] = [28.4682, 49.2331];
      if (baseField) {
        try {
          const geom = JSON.parse(baseField.geometryGeoJSON);
          const coordsArray = geom.coordinates?.[0] ?? [];
          const avg = coordsArray.reduce(
            (acc: [number, number], cur: [number, number]) => [acc[0] + cur[0], acc[1] + cur[1]],
            [0, 0]
          );
          if (coordsArray.length) {
            coords = [avg[0] / coordsArray.length + 0.01, avg[1] / coordsArray.length + 0.01];
          }
        } catch {
          coords = [28.4682, 49.2331];
        }
      }
      const feature: Feature<PointGeometry, GeoJsonProperties> = {
        type: "Feature",
        id: item.id,
        properties: { name: item.name },
        geometry: { type: "Point", coordinates: coords }
      };
      return feature;
    });
    return { type: "FeatureCollection", features: points };
  }, [machinery, filteredFields]);

  const selectedField = fields.find((field) => field.id === selectedId) ?? null;

  const relatedReports = React.useMemo(() => {
    if (!selectedField) return [];
    return reports.filter((report) =>
      report.tags.toLowerCase().includes(selectedField.code.toLowerCase())
    );
  }, [reports, selectedField]);

  const resetAdd = () => {
    setAddField(createDefaultAddField());
    setWizardStep(1);
    setDrawMode(false);
    setNewPolygon(null);
    newPolygonRef.current = null;
  };

  const openAddField = () => {
    resetAdd();
    setAddOpen(true);
  };

  const handleDrawChange = React.useCallback((geom: Geometry | null) => {
    newPolygonRef.current = geom;
    setNewPolygon(geom);
  }, []);

  const handleSaveField = async () => {
    const polygon = newPolygonRef.current ?? newPolygon;
    if (!polygon || polygon.type !== "Polygon") {
      toast.error("Намалюйте полігон поля");
      return;
    }
    const areaHa = Number(addField.areaHa);
    const yieldForecastTons = Number(addField.yieldForecastTons);
    const soilMoisturePct = Number(addField.soilMoisturePct);
    if (!Number.isFinite(areaHa) || areaHa <= 0) {
      toast.error("Вкажіть площу поля");
      return;
    }
    if (!Number.isFinite(yieldForecastTons) || yieldForecastTons <= 0) {
      toast.error("Вкажіть прогноз врожаю");
      return;
    }
    if (!Number.isFinite(soilMoisturePct) || soilMoisturePct < 0 || soilMoisturePct > 100) {
      toast.error("Вкажіть вологість ґрунту (0-100%)");
      return;
    }
    try {
      const response = await fetch("/api/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addField.code.trim(),
          name: addField.name.trim() || `Поле ${addField.code.trim()}`,
          cropType: addField.cropType,
          status: addField.status,
          district: addField.district,
          sowingDate: addField.sowingDate
            ? `${addField.sowingDate}T00:00:00.000Z`
            : null,
          lastInspectionAt: addField.lastInspectionAt
            ? `${addField.lastInspectionAt}T00:00:00.000Z`
            : null,
          areaHa,
          yieldForecastTons,
          soilMoisturePct,
          geometryGeoJSON: JSON.stringify(polygon)
        })
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setFields((prev) => [data.field, ...prev]);
      toast.success("Поле додано");
      setAddOpen(false);
      resetAdd();
    } catch {
      toast.error("Не вдалося зберегти поле");
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) {
      toast.error("Вкажіть назву задачі");
      return;
    }
    if (!selectedField) {
      toast.error("Оберіть поле");
      return;
    }
    try {
      const response = await fetch("/api/fields/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId: selectedField.id,
          title: taskTitle.trim()
        })
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      const newTask = {
        id: data.task.id,
        title: data.task.title,
        status: data.task.status,
        createdAt: new Date(data.task.createdAt).toISOString()
      };
      setFields((prev) =>
        prev.map((field) =>
          field.id === selectedField.id
            ? { ...field, tasks: [newTask, ...field.tasks] }
            : field
        )
      );
      toast.success("Задачу додано");
      setTaskTitle("");
      setTaskOpen(false);
    } catch {
      toast.error("Не вдалося додати задачу");
    }
  };

  const cycleTaskStatus = (status: FieldItem["tasks"][number]["status"]) => {
    if (status === "OPEN") return "IN_PROGRESS";
    if (status === "IN_PROGRESS") return "DONE";
    return "OPEN";
  };

  const handleTaskStatus = async (taskId: string, status: FieldItem["tasks"][number]["status"]) => {
    const nextStatus = cycleTaskStatus(status);
    try {
      const response = await fetch("/api/fields/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: nextStatus })
      });
      if (!response.ok) throw new Error("Failed");
      setFields((prev) =>
        prev.map((field) => ({
          ...field,
          tasks: field.tasks.map((task) =>
            task.id === taskId ? { ...task, status: nextStatus } : task
          )
        }))
      );
    } catch {
      toast.error("Не вдалося оновити задачу");
    }
  };

  const handleDeleteField = async () => {
    if (!selectedField) return;
    const confirmed = window.confirm(`Видалити поле ${selectedField.code}?`);
    if (!confirmed) return;
    try {
      const response = await fetch("/api/fields", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedField.id })
      });
      if (!response.ok) throw new Error("Failed");
      setFields((prev) => prev.filter((field) => field.id !== selectedField.id));
      setSelectedId(null);
      toast.success("Поле видалено");
    } catch {
      toast.error("Не вдалося видалити поле");
    }
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
                className="rounded-2xl bg-white/70 p-2 text-ink shadow-glass"
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
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Останні події</p>
            <div className="mt-3 space-y-3">
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Огляд поля</p>
                <p className="mt-2 text-sm font-semibold">Поле A1 • Вологість 23%</p>
                <p className="text-xs text-ink/50">2 години тому</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Техніка</p>
                <p className="mt-2 text-sm font-semibold">Трактор №5 на полі B3</p>
                <p className="text-xs text-ink/50">Щойно</p>
              </GlassCard>
            </div>
          </div>
        </aside>

        <GlassPanel className="flex-1 rounded-[32px] p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Поля</p>
              <h1 className="text-2xl font-semibold">Інтерактивна карта</h1>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <div className="min-w-[180px] max-w-xs flex-1">
                <Input
                  placeholder="Пошук поля…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Button onClick={openAddField} className="whitespace-nowrap">
                <Plus size={16} /> Додати поле
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
            <GlassCard className="h-fit p-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-ink/60">Пошук поля…</label>
                  <Input
                    className="mt-2"
                    placeholder="Код або назва"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-ink/60">Культура</label>
                  <select
                    className="input-surface mt-2 h-11 w-full rounded-input px-4 text-sm"
                    value={cropFilter}
                    onChange={(event) => setCropFilter(event.target.value)}
                  >
                    {cropOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "Усі культури" : option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink/60">Статус</label>
                  <select
                    className="input-surface mt-2 h-11 w-full rounded-input px-4 text-sm"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">Усі статуси</option>
                    <option value="ACTIVE">Активне</option>
                    <option value="DORMANT">Пауза</option>
                    <option value="HARVEST">Збір</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink/60">Район</label>
                  <select
                    className="input-surface mt-2 h-11 w-full rounded-input px-4 text-sm"
                    value={districtFilter}
                    onChange={(event) => setDistrictFilter(event.target.value)}
                  >
                    {districtOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "Усі райони" : option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink/60">Рік</label>
                  <select
                    className="input-surface mt-2 h-11 w-full rounded-input px-4 text-sm"
                    value={yearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                  >
                    {yearOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "all" ? "Усі роки" : option}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>Показувати техніку на мапі</span>
                  <input
                    type="checkbox"
                    checked={showMachinery}
                    onChange={(event) => setShowMachinery(event.target.checked)}
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <Button onClick={openAddField} className="w-full">
                    <Plus size={16} /> Додати поле
                  </Button>
                </div>
              </div>
            </GlassCard>

            <div className="relative">
              <GlassCard className="relative h-[70vh] min-h-[520px] overflow-hidden rounded-[28px]">
                <FieldsMap
                  fields={featureCollection}
                  machinery={machineryPoints}
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId(id)}
                  showMachinery={showMachinery}
                  drawMode={drawMode}
                  onDrawChange={handleDrawChange}
                />

                {selectedField && (
                  <div className="absolute right-4 top-4 bottom-4 z-20 w-[300px] rounded-card bg-white/80 p-4 shadow-glass backdrop-blur-2xl">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Поле: {selectedField.code}</p>
                      <button
                        onClick={() => setSelectedId(null)}
                        className="rounded-full p-1 text-ink/50 transition hover:text-ink"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-ink/70">
                      <p>Культура: {selectedField.cropType}</p>
                      <p>
                        Посів: {selectedField.sowingDate ? formatDate(selectedField.sowingDate) : "—"}
                      </p>
                      <p>Прогноз врожаю: {selectedField.yieldForecastTons} т</p>
                      <p>Площа: {selectedField.areaHa} га</p>
                      <p>Вологість ґрунту: {selectedField.soilMoisturePct}%</p>
                      <p>
                        Останній огляд:{" "}
                        {selectedField.lastInspectionAt
                          ? formatDate(selectedField.lastInspectionAt)
                          : "—"}
                      </p>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
                        Задачі
                      </p>
                      <div className="mt-2 space-y-2 text-xs">
                        {selectedField.tasks.length ? (
                          selectedField.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2"
                            >
                              <div>
                                <p className="text-ink">{task.title}</p>
                                <p className="text-ink/50">
                                  {taskStatusLabel[task.status]}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleTaskStatus(task.id, task.status)}
                              >
                                Змінити
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-ink/50">Немає задач</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setReportsOpen(true)}
                      >
                        Відкрити звіт
                      </Button>
                      <Button className="w-full" onClick={() => setTaskOpen(true)}>
                        Додати задачу
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-red-200/70 text-red-700 hover:bg-red-50/70"
                        onClick={handleDeleteField}
                      >
                        Видалити поле
                      </Button>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </GlassPanel>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Додати поле">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-ink/60">
            <span className={wizardStep === 1 ? "text-ink" : ""}>1. Дані</span>
            <span>—</span>
            <span className={wizardStep === 2 ? "text-ink" : ""}>2. Полігон</span>
            <span>—</span>
            <span className={wizardStep === 3 ? "text-ink" : ""}>3. Збереження</span>
          </div>

          {wizardStep === 1 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink/60">Код поля</label>
                <Input
                  className="mt-2"
                  placeholder="A1"
                  value={addField.code}
                  onChange={(event) =>
                    setAddField((prev) => ({ ...prev, code: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-ink/60">Назва поля</label>
                <Input
                  className="mt-2"
                  placeholder="Північне"
                  value={addField.name}
                  onChange={(event) =>
                    setAddField((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-ink/60">Культура</label>
                <Input
                  className="mt-2"
                  placeholder="Пшениця"
                  value={addField.cropType}
                  onChange={(event) =>
                    setAddField((prev) => ({ ...prev, cropType: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-ink/60">Район</label>
                <Input
                  className="mt-2"
                  placeholder="Вінницький"
                  value={addField.district}
                  onChange={(event) =>
                    setAddField((prev) => ({ ...prev, district: event.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink/60">Площа (га)</label>
                  <Input
                    className="mt-2"
                    type="number"
                    step="0.1"
                    placeholder="120"
                    value={addField.areaHa}
                    onChange={(event) =>
                      setAddField((prev) => ({ ...prev, areaHa: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-ink/60">Прогноз врожаю (т)</label>
                  <Input
                    className="mt-2"
                    type="number"
                    step="1"
                    placeholder="65"
                    value={addField.yieldForecastTons}
                    onChange={(event) =>
                      setAddField((prev) => ({ ...prev, yieldForecastTons: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink/60">Вологість ґрунту (%)</label>
                  <Input
                    className="mt-2"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    placeholder="24"
                    value={addField.soilMoisturePct}
                    onChange={(event) =>
                      setAddField((prev) => ({ ...prev, soilMoisturePct: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-ink/60">Дата посіву</label>
                  <Input
                    className="mt-2"
                    type="date"
                    value={addField.sowingDate}
                    onChange={(event) =>
                      setAddField((prev) => ({ ...prev, sowingDate: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-ink/60">Останній огляд</label>
                <Input
                  className="mt-2"
                  type="date"
                  value={addField.lastInspectionAt}
                  onChange={(event) =>
                    setAddField((prev) => ({ ...prev, lastInspectionAt: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-ink/60">Статус поля</label>
                <select
                  className="input-surface mt-2 h-11 w-full rounded-input px-4 text-sm"
                  value={addField.status}
                  onChange={(event) =>
                    setAddField((prev) => ({
                      ...prev,
                      status: event.target.value as FieldItem["status"]
                    }))
                  }
                >
                  <option value="ACTIVE">Активне</option>
                  <option value="DORMANT">Пауза</option>
                  <option value="HARVEST">Збір</option>
                </select>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!addField.code.trim()) {
                    toast.error("Вкажіть код поля");
                    return;
                  }
                  setWizardStep(2);
                  setAddOpen(false);
                  setDrawMode(true);
                }}
              >
                Далі
              </Button>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-ink/70">
                Перевірте дані та натисніть “Зберегти”.
              </p>
              <Button className="w-full" onClick={handleSaveField}>
                Зберегти поле
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setWizardStep(2);
                  setAddOpen(false);
                  setDrawMode(true);
                }}
              >
                Назад
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {drawMode && wizardStep === 2 && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="pointer-events-none absolute inset-0 bg-black/10" />
          <div className="pointer-events-auto absolute right-10 top-28 w-[320px] rounded-card bg-white/85 p-4 shadow-glass backdrop-blur-2xl">
            <p className="text-sm font-semibold">Крок 2: Полігон</p>
            <p className="mt-2 text-xs text-ink/60">
              Натисніть “Почати малювання”, потім клікайте по мапі для точок. Замкніть
              полігон кліком по першій точці (вона підсвічується) або кнопкою нижче.
            </p>
            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("fields:draw-start"))
                }
              >
                Почати малювання
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("fields:draw-finish"))
                }
              >
                Завершити полігон
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("fields:draw-clear"));
                  newPolygonRef.current = null;
                  setNewPolygon(null);
                }}
              >
                Очистити
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("fields:draw-finish"));
                  const geometry = newPolygonRef.current ?? newPolygon;
                  if (!geometry) {
                    toast.error("Полігон не знайдено");
                    return;
                  }
                  setWizardStep(3);
                  setDrawMode(false);
                  setAddOpen(true);
                }}
              >
                Далі
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setWizardStep(1);
                  setDrawMode(false);
                  setAddOpen(true);
                }}
              >
                Назад
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="Додати задачу">
        <div className="space-y-3">
          <Input
            placeholder="Назва задачі"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
          />
          <Button className="w-full" onClick={handleAddTask}>
            Додати
          </Button>
        </div>
      </Modal>

      <Modal open={reportsOpen} onClose={() => setReportsOpen(false)} title="Пов'язані звіти">
        <div className="space-y-3 text-sm text-ink/70">
          {relatedReports.length ? (
            relatedReports.map((report) => (
              <div key={report.id} className="rounded-xl bg-white/70 px-3 py-2">
                <p className="font-medium">{report.fileNameOriginal}</p>
                <p className="text-xs text-ink/50">
                  {report.uploadedBy} • {formatDate(report.uploadedAt)}
                </p>
              </div>
            ))
          ) : (
            <p>Звіти для цього поля поки не знайдені.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
