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
  Send,
  PhoneCall,
  Mail,
  ShieldCheck,
  Clock,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { IconRail } from "@/components/ui/icon-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatingDock } from "@/components/ui/floating-dock";
import { formatDateTime } from "@/lib/format";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  createdAt: string;
  attachments: { id: string; fileNameOriginal: string }[];
};

const STATUS_LABEL: Record<Ticket["status"], string> = {
  OPEN: "Новий",
  IN_PROGRESS: "В роботі",
  CLOSED: "Закрито"
};

const PRIORITY_LABEL: Record<Ticket["priority"], string> = {
  LOW: "Низький",
  MEDIUM: "Середній",
  HIGH: "Високий",
  CRITICAL: "Критичний"
};

export function SupportClient({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = React.useState<Ticket[]>(initialTickets);
  const [subject, setSubject] = React.useState("");
  const [category, setCategory] = React.useState("Операційні питання");
  const [priority, setPriority] = React.useState<Ticket["priority"]>("MEDIUM");
  const [message, setMessage] = React.useState("");
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  const refreshTickets = async (options?: { silent?: boolean }) => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/support");
      if (!response.ok) throw new Error();
      const data = await response.json();
      const next = (data.tickets as Ticket[]) ?? [];
      setTickets(
        next.map((ticket) => ({
          ...ticket,
          createdAt: new Date(ticket.createdAt).toISOString(),
          attachments: ticket.attachments ?? []
        }))
      );
      if (!options?.silent) {
        toast.success("Статус оновлено");
      }
    } catch {
      toast.error("Не вдалося оновити статус");
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Заповніть тему та опис");
      return;
    }
    try {
      const formData = new FormData();
      formData.set("subject", subject.trim());
      formData.set("category", category);
      formData.set("priority", priority);
      formData.set("message", message.trim());
      if (attachment) {
        formData.set("attachment", attachment);
      }
      const response = await fetch("/api/support", {
        method: "POST",
        body: formData
      });
      if (!response.ok) throw new Error();
      await refreshTickets({ silent: true });
      setSubject("");
      setMessage("");
      setAttachment(null);
      toast.success("Запит створено");
    } catch {
      toast.error("Не вдалося створити запит");
    }
  };

  const avgMinutes = React.useMemo(() => {
    if (!tickets.length) return 0;
    const now = Date.now();
    const total = tickets.reduce((acc, ticket) => {
      return acc + Math.max(0, now - new Date(ticket.createdAt).getTime());
    }, 0);
    return Math.round(total / tickets.length / 60000);
  }, [tickets]);

  const criticalCount = React.useMemo(
    () => tickets.filter((ticket) => ticket.priority === "CRITICAL").length,
    [tickets]
  );

  const openCount = React.useMemo(
    () => tickets.filter((ticket) => ticket.status !== "CLOSED").length,
    [tickets]
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
                className="rounded-2xl bg-white/40 p-2 text-ink/60 transition hover:bg-white/60 hover:text-ink"
              >
                <Settings size={18} />
              </Link>
              <Link
                href="/support"
                aria-label="Підтримка"
                className="rounded-2xl bg-white/70 p-2 text-ink shadow-glass"
              >
                <LifeBuoy size={18} />
              </Link>
            </IconRail>
          </div>
        </div>

        <aside className="hidden w-[260px] flex-col gap-4 xl:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Контакти</p>
            <div className="mt-3 space-y-3">
              <GlassCard className="p-4">
                <div className="flex items-center gap-3 text-sm">
                  <PhoneCall size={16} />
                  <div>
                    <p className="font-semibold">Гаряча лінія</p>
                    <p className="text-xs text-ink/50">+380 44 501 22 12</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} />
                  <div>
                    <p className="font-semibold">support@agroplus.ua</p>
                    <p className="text-xs text-ink/50">Відповідь протягом 2 годин</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
          <div className="mt-6" id="support-sla">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">SLA</p>
            <div className="mt-3 space-y-3">
              <GlassCard className="p-4">
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={16} />
                  <div>
                    <p className="font-semibold">Робочий час</p>
                    <p className="text-xs text-ink/50">08:00 – 20:00</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3 text-sm">
                  <ShieldCheck size={16} />
                  <div>
                    <p className="font-semibold">Критичні заявки</p>
                    <p className="text-xs text-ink/50">Відповідь до 30 хв</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </aside>

        <GlassPanel className="flex-1 rounded-[32px] p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Підтримка / Support
              </p>
              <h1 className="text-2xl font-semibold">Центр підтримки</h1>
            </div>
            <Button variant="outline" onClick={refreshTickets} disabled={refreshing}>
              <Clock size={16} /> Оновити статус
            </Button>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Новий запит</h3>
                  <span className="text-xs text-ink/50">Адмін отримує доступ до всіх заявок</span>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="text-xs text-ink/60">
                    Тема
                    <Input
                      className="mt-2"
                      placeholder="Наприклад, проблема з експортом"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-ink/60">
                      Категорія
                      <select
                        className="input-surface mt-2 h-10 w-full rounded-input px-3 text-sm"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                      >
                        <option>Операційні питання</option>
                        <option>Інтеграції</option>
                        <option>Доступ</option>
                        <option>Звіти</option>
                        <option>Склад</option>
                      </select>
                    </label>
                    <label className="text-xs text-ink/60">
                      Пріоритет
                      <select
                        className="input-surface mt-2 h-10 w-full rounded-input px-3 text-sm"
                        value={priority}
                        onChange={(event) =>
                          setPriority(event.target.value as Ticket["priority"])
                        }
                      >
                        <option value="LOW">Низький</option>
                        <option value="MEDIUM">Середній</option>
                        <option value="HIGH">Високий</option>
                        <option value="CRITICAL">Критичний</option>
                      </select>
                    </label>
                  </div>
                  <label className="text-xs text-ink/60">
                    Опис
                    <textarea
                      className="input-surface mt-2 h-28 w-full rounded-input px-4 py-3 text-sm text-ink placeholder:text-ink/40"
                      placeholder="Опишіть проблему або запит"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleCreate} className="whitespace-nowrap">
                      <Send size={16} /> Створити запит
                    </Button>
                    <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                      <Plus size={16} /> Додати файл
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={(event) =>
                        setAttachment(event.target.files?.[0] ?? null)
                      }
                    />
                    {attachment ? (
                      <span className="text-xs text-ink/50">
                        {attachment.name}
                      </span>
                    ) : null}
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Активні заявки</h3>
                <div className="mt-4 space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="rounded-xl bg-white/60 px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-ink">{ticket.subject}</p>
                        <span className="text-xs text-ink/50">
                          {STATUS_LABEL[ticket.status]}
                        </span>
                      </div>
                      <p className="text-xs text-ink/50">
                        {ticket.category} • {PRIORITY_LABEL[ticket.priority]}
                      </p>
                      <p className="text-xs text-ink/40">
                        {formatDateTime(ticket.createdAt)}
                      </p>
                      {ticket.attachments.length ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink/60">
                          {ticket.attachments.map((file) => (
                            <a
                              key={file.id}
                              href={`/api/support/attachments/${file.id}`}
                              className="rounded-full bg-white/70 px-2 py-1 transition hover:bg-white"
                            >
                              {file.fileNameOriginal}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="space-y-5">
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Статистика</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Відкриті</span>
                    <span className="font-semibold">{openCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Середній час відповіді</span>
                    <span className="font-semibold">{avgMinutes} хв</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Критичні</span>
                    <span className="font-semibold">{criticalCount}</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Гайд</h3>
                <div className="mt-3 space-y-2 text-sm text-ink/60">
                  <p>1. Перевірте статус інтеграцій.</p>
                  <p>2. Додайте скріншоти або логи.</p>
                  <p>3. Вкажіть пріоритет і критичність.</p>
                </div>
              </GlassCard>
            </div>
          </div>

          <FloatingDock className="mt-8">
            <Button size="sm" onClick={handleCreate}>
              <Send size={14} /> Створити запит
            </Button>
            <Button size="sm" variant="outline" onClick={refreshTickets}>
              <Clock size={14} /> Перевірити статус
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                document.getElementById("support-sla")?.scrollIntoView({
                  behavior: "smooth"
                })
              }
            >
              <ShieldCheck size={14} /> SLA
            </Button>
          </FloatingDock>
        </GlassPanel>
      </div>
    </div>
  );
}
