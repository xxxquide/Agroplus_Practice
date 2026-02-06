"use client";

import * as React from "react";
import Link from "next/link";
import {
  Home,
  Map as MapIcon,
  Warehouse,
  FileText,
  Users,
  Settings,
  LifeBuoy,
  Save,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { type SettingsData } from "@/lib/settings";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { IconRail } from "@/components/ui/icon-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatingDock } from "@/components/ui/floating-dock";
import { StatusPill } from "@/components/ui/status-pill";

function Toggle({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full border transition ${
        checked ? "border-brand/50 bg-brand/80" : "border-white/50 bg-white/60"
      }`}
    >
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        {description ? <p className="text-xs text-ink/50">{description}</p> : null}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function SettingsClient({
  initialSettings,
  defaultSettings
}: {
  initialSettings: SettingsData;
  defaultSettings: SettingsData;
}) {
  const [state, setState] = React.useState<SettingsData>(initialSettings);
  const [saving, setSaving] = React.useState(false);
  const savedRef = React.useRef<SettingsData>(initialSettings);

  React.useEffect(() => {
    setState(initialSettings);
    savedRef.current = initialSettings;
  }, [initialSettings]);

  const updateSection = <K extends keyof SettingsData>(
    section: K,
    value: SettingsData[K]
  ) => setState((prev) => ({ ...prev, [section]: value }));

  const persistSettings = React.useCallback(
    async (nextSettings: SettingsData, notify?: boolean) => {
      setSaving(true);
      try {
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextSettings)
        });
        if (!response.ok) throw new Error();
        savedRef.current = nextSettings;
        if (notify) toast.success("Налаштування збережено");
      } catch {
        if (notify) toast.error("Не вдалося зберегти налаштування");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleSave = () => persistSettings(state, true);

  const handleReset = () => {
    setState(defaultSettings);
    persistSettings(defaultSettings, true);
    toast.message("Повернули стандартні налаштування");
  };

  const handleSync = async () => {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setState(data.settings);
      savedRef.current = data.settings;
      toast.message("Оновлення синхронізовано");
    } catch {
      toast.error("Не вдалося синхронізувати");
    }
  };

  const isDirty = React.useMemo(
    () => JSON.stringify(state) !== JSON.stringify(savedRef.current),
    [state]
  );

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
                className="rounded-2xl bg-white/70 p-2 text-ink shadow-glass"
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
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Останні зміни</p>
            <div className="mt-3 space-y-3">
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Сповіщення</p>
                <p className="mt-2 text-sm font-semibold">Щоденний дайджест активний</p>
                <p className="text-xs text-ink/50">Оновлено 2 хв тому</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Доступ</p>
                <p className="mt-2 text-sm font-semibold">Потрібне підтвердження змін</p>
                <p className="text-xs text-ink/50">Сьогодні</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Інтеграції</p>
                <p className="mt-2 text-sm font-semibold">Погода: Open-Meteo</p>
                <p className="text-xs text-ink/50">Стабільно</p>
              </GlassCard>
            </div>
          </div>
        </aside>

        <GlassPanel className="flex-1 rounded-[32px] p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Налаштування / Settings
              </p>
              <h1 className="text-2xl font-semibold">Панель налаштувань</h1>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill
                label={saving ? "Збереження..." : isDirty ? "Є зміни" : "Готово"}
                tone={saving || isDirty ? "warning" : "success"}
              />
              <span className="text-xs text-ink/50">Дані зберігаються в базі</span>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Профіль користувача</h3>
                  <StatusPill label={state.profile.role} tone="neutral" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-ink/60">
                    Імʼя
                    <Input
                      className="mt-2"
                      value={state.profile.name}
                      onChange={(event) =>
                        updateSection("profile", {
                          ...state.profile,
                          name: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Посада
                    <Input
                      className="mt-2"
                      value={state.profile.role}
                      onChange={(event) =>
                        updateSection("profile", {
                          ...state.profile,
                          role: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Відділ
                    <Input
                      className="mt-2"
                      value={state.profile.department}
                      onChange={(event) =>
                        updateSection("profile", {
                          ...state.profile,
                          department: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Телефон
                    <Input
                      className="mt-2"
                      value={state.profile.phone}
                      onChange={(event) =>
                        updateSection("profile", {
                          ...state.profile,
                          phone: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60 sm:col-span-2">
                    Email (керується адміністратором)
                    <Input className="mt-2" value={state.profile.email} readOnly />
                  </label>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Робочі параметри</h3>
                <div className="mt-4 space-y-4">
                  <SettingRow label="Мова інтерфейсу" description="Відображення та формати">
                    <select
                      className="input-surface h-10 rounded-input px-3 text-sm"
                      value={state.preferences.language}
                      onChange={(event) =>
                        updateSection("preferences", {
                          ...state.preferences,
                          language: event.target.value
                        })
                      }
                    >
                      <option>Українська</option>
                      <option>English</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Часовий пояс">
                    <select
                      className="input-surface h-10 rounded-input px-3 text-sm"
                      value={state.preferences.timezone}
                      onChange={(event) =>
                        updateSection("preferences", {
                          ...state.preferences,
                          timezone: event.target.value
                        })
                      }
                    >
                      <option>Europe/Kyiv</option>
                      <option>Europe/Warsaw</option>
                      <option>UTC</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Початок тижня">
                    <select
                      className="input-surface h-10 rounded-input px-3 text-sm"
                      value={state.preferences.weekStart}
                      onChange={(event) =>
                        updateSection("preferences", {
                          ...state.preferences,
                          weekStart: event.target.value
                        })
                      }
                    >
                      <option>Понеділок</option>
                      <option>Неділя</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Система одиниць">
                    <select
                      className="input-surface h-10 rounded-input px-3 text-sm"
                      value={state.preferences.units}
                      onChange={(event) =>
                        updateSection("preferences", {
                          ...state.preferences,
                          units: event.target.value
                        })
                      }
                    >
                      <option>Метрична система</option>
                      <option>Імперська система</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Температура">
                    <select
                      className="input-surface h-10 rounded-input px-3 text-sm"
                      value={state.preferences.tempUnit}
                      onChange={(event) =>
                        updateSection("preferences", {
                          ...state.preferences,
                          tempUnit: event.target.value
                        })
                      }
                    >
                      <option>°C</option>
                      <option>°F</option>
                    </select>
                  </SettingRow>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Сповіщення</h3>
                <div className="mt-4 space-y-4">
                  <SettingRow
                    label="Email повідомлення"
                    description="Ключові події та звіти"
                  >
                    <Toggle
                      checked={state.notifications.email}
                      onChange={(value) =>
                        updateSection("notifications", {
                          ...state.notifications,
                          email: value
                        })
                      }
                    />
                  </SettingRow>
                  <SettingRow label="Push у браузері" description="Швидкі сигнали у панелі">
                    <Toggle
                      checked={state.notifications.push}
                      onChange={(value) =>
                        updateSection("notifications", {
                          ...state.notifications,
                          push: value
                        })
                      }
                    />
                  </SettingRow>
                  <SettingRow label="Звіти та документи">
                    <Toggle
                      checked={state.notifications.reports}
                      onChange={(value) =>
                        updateSection("notifications", {
                          ...state.notifications,
                          reports: value
                        })
                      }
                    />
                  </SettingRow>
                  <SettingRow label="Погодні ризики">
                    <Toggle
                      checked={state.notifications.weather}
                      onChange={(value) =>
                        updateSection("notifications", {
                          ...state.notifications,
                          weather: value
                        })
                      }
                    />
                  </SettingRow>
                  <SettingRow label="Статус техніки">
                    <Toggle
                      checked={state.notifications.machinery}
                      onChange={(value) =>
                        updateSection("notifications", {
                          ...state.notifications,
                          machinery: value
                        })
                      }
                    />
                  </SettingRow>
                  <SettingRow label="Складський контроль">
                    <Toggle
                      checked={state.notifications.inventory}
                      onChange={(value) =>
                        updateSection("notifications", {
                          ...state.notifications,
                          inventory: value
                        })
                      }
                    />
                  </SettingRow>
                  <SettingRow label="Щоденний дайджест">
                    <Toggle
                      checked={state.notifications.dailyDigest}
                      onChange={(value) =>
                        updateSection("notifications", {
                          ...state.notifications,
                          dailyDigest: value
                        })
                      }
                    />
                  </SettingRow>
                </div>
              </GlassCard>
            </div>

            <div className="space-y-5">
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Організація</h3>
                <div className="mt-4 space-y-3">
                  <label className="text-xs text-ink/60">
                    Назва компанії
                    <Input
                      className="mt-2"
                      value={state.org.company}
                      onChange={(event) =>
                        updateSection("org", { ...state.org, company: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Регіон
                    <Input
                      className="mt-2"
                      value={state.org.region}
                      onChange={(event) =>
                        updateSection("org", { ...state.org, region: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Базова локація
                    <Input
                      className="mt-2"
                      value={state.org.baseLocation}
                      onChange={(event) =>
                        updateSection("org", {
                          ...state.org,
                          baseLocation: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Валюта звітів
                    <Input
                      className="mt-2"
                      value={state.org.currency}
                      onChange={(event) =>
                        updateSection("org", { ...state.org, currency: event.target.value })
                      }
                    />
                  </label>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Інтеграції</h3>
                <div className="mt-4 space-y-4">
                  <SettingRow label="Погода">
                    <select
                      className="input-surface h-10 rounded-input px-3 text-sm"
                      value={state.integrations.weatherSource}
                      onChange={(event) =>
                        updateSection("integrations", {
                          ...state.integrations,
                          weatherSource: event.target.value
                        })
                      }
                    >
                      <option>Open-Meteo</option>
                      <option>Синоптик</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Курси валют">
                    <select
                      className="input-surface h-10 rounded-input px-3 text-sm"
                      value={state.integrations.ratesSource}
                      onChange={(event) =>
                        updateSection("integrations", {
                          ...state.integrations,
                          ratesSource: event.target.value
                        })
                      }
                    >
                      <option>НБУ</option>
                      <option>Manual</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Паливо">
                    <select
                      className="input-surface h-10 rounded-input px-3 text-sm"
                      value={state.integrations.fuelSource}
                      onChange={(event) =>
                        updateSection("integrations", {
                          ...state.integrations,
                          fuelSource: event.target.value
                        })
                      }
                    >
                      <option>Ручне оновлення</option>
                      <option>API постачальника</option>
                    </select>
                  </SettingRow>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Доступ та контроль</h3>
                <div className="mt-4 space-y-4">
                  <SettingRow
                    label="Підтвердження змін"
                    description="Всі зміни даних потребують підтвердження адміністратора"
                  >
                    <Toggle
                      checked={state.access.approvals}
                      onChange={(value) =>
                        updateSection("access", { ...state.access, approvals: value })
                      }
                    />
                  </SettingRow>
                  <SettingRow label="Зберігання історії (міс.)">
                    <Input
                      className="h-10 w-24 text-center"
                      value={state.access.dataRetention}
                      onChange={(event) =>
                        updateSection("access", {
                          ...state.access,
                          dataRetention: event.target.value
                        })
                      }
                    />
                  </SettingRow>
                  <div className="rounded-2xl bg-white/60 px-4 py-3 text-xs text-ink/60">
                    Зміна доступів та створення нових акаунтів виконується адміністратором.
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          <FloatingDock className="mt-8">
            <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              <Save size={14} /> Зберегти
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw size={14} /> Скинути
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSync}
              disabled={saving}
            >
              <Sparkles size={14} /> Синхронізувати
            </Button>
          </FloatingDock>
        </GlassPanel>
      </div>
    </div>
  );
}
