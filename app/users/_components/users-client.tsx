"use client";

import * as React from "react";
import Link from "next/link";
import {
  Home,
  Map as MapIcon,
  Warehouse,
  FileText,
  Settings,
  LifeBuoy,
  Users,
  UserPlus,
  KeyRound,
  Pencil,
  RefreshCw,
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { IconRail } from "@/components/ui/icon-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDateTime } from "@/lib/format";

type UserRow = {
  id: string;
  login: string;
  email: string | null;
  name: string;
  role: "ADMIN" | "MANAGER" | "VIEWER";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
};

type CreateForm = {
  name: string;
  login: string;
  email: string;
  role: UserRow["role"];
  isActive: boolean;
  password: string;
  confirm: string;
};

type EditForm = {
  name: string;
  login: string;
  email: string;
  role: UserRow["role"];
  isActive: boolean;
};

type PasswordForm = {
  password: string;
  confirm: string;
};

const ROLE_LABELS: Record<UserRow["role"], string> = {
  ADMIN: "Адмін",
  MANAGER: "Менеджер",
  VIEWER: "Перегляд"
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const defaultCreate: CreateForm = {
  name: "",
  login: "",
  email: "",
  role: "MANAGER",
  isActive: true,
  password: "",
  confirm: ""
};

const defaultPassword: PasswordForm = {
  password: "",
  confirm: ""
};

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return fallback;
};

function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const array = new Uint32Array(length);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i += 1) array[i] = Math.floor(Math.random() * chars.length);
  }
  return Array.from(array)
    .map((value) => chars[value % chars.length])
    .join("");
}

export function UsersClient({
  initialUsers,
  currentUserId
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = React.useState<UserRow[]>(initialUsers);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialUsers[0]?.id ?? null
  );
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [accessFilter, setAccessFilter] = React.useState("all");
  const [onlineFilter, setOnlineFilter] = React.useState("all");
  const [pageIndex, setPageIndex] = React.useState(0);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<UserRow | null>(null);
  const [passwordUser, setPasswordUser] = React.useState<UserRow | null>(null);
  const [createForm, setCreateForm] = React.useState<CreateForm>(defaultCreate);
  const [editForm, setEditForm] = React.useState<EditForm | null>(null);
  const [passwordForm, setPasswordForm] = React.useState<PasswordForm>(defaultPassword);
  const [saving, setSaving] = React.useState(false);
  const [clock, setClock] = React.useState(Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-menu-root]")) return;
      setMenuOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredUsers = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.login.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesAccess =
        accessFilter === "all" ||
        (accessFilter === "active" ? user.isActive : !user.isActive);
      const isOnline =
        user.lastActiveAt &&
        new Date(user.lastActiveAt).getTime() >= clock - ONLINE_WINDOW_MS;
      const matchesOnline =
        onlineFilter === "all" ||
        (onlineFilter === "online" ? isOnline : !isOnline);
      return matchesQuery && matchesRole && matchesAccess && matchesOnline;
    });
  }, [users, search, roleFilter, accessFilter, onlineFilter, clock]);

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

  React.useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(pageCount - 1);
    }
  }, [pageIndex, pageCount]);

  const totals = React.useMemo(() => {
    const online = users.filter(
      (user) =>
        user.lastActiveAt &&
        new Date(user.lastActiveAt).getTime() >= clock - ONLINE_WINDOW_MS
    ).length;
    const active = users.filter((user) => user.isActive).length;
    const admins = users.filter((user) => user.role === "ADMIN").length;
    const managers = users.filter((user) => user.role === "MANAGER").length;
    return {
      total: users.length,
      online,
      active,
      admins,
      managers
    };
  }, [users, clock]);

  const selectedUser = users.find((user) => user.id === selectedId) ?? null;

  React.useEffect(() => {
    if (selectedId && users.some((user) => user.id === selectedId)) return;
    setSelectedId(users[0]?.id ?? null);
  }, [users, selectedId]);

  const refreshUsers = React.useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("load");
      const data = (await response.json()) as { users: UserRow[] };
      setUsers(data.users);
    } catch {
      toast.error("Не вдалося оновити список");
    }
  }, []);

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.login.trim()) {
      toast.error("Заповніть ім'я та логін");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("Пароль має містити мінімум 6 символів");
      return;
    }
    if (createForm.password !== createForm.confirm) {
      toast.error("Паролі не співпадають");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          login: createForm.login,
          email: createForm.email,
          role: createForm.role,
          isActive: createForm.isActive,
          password: createForm.password
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "create");
      }
      setUsers((prev) => [data.user as UserRow, ...prev]);
      setCreateForm(defaultCreate);
      setCreateOpen(false);
      toast.success("Користувача додано");
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, "Не вдалося створити користувача"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser || !editForm) return;
    if (!editForm.name.trim() || !editForm.login.trim()) {
      toast.error("Заповніть ім'я та логін");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          login: editForm.login,
          email: editForm.email,
          role: editForm.role,
          isActive: editForm.isActive
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "update");
      }
      setUsers((prev) =>
        prev.map((user) => (user.id === editUser.id ? (data.user as UserRow) : user))
      );
      setEditUser(null);
      setEditForm(null);
      toast.success("Дані оновлено");
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, "Не вдалося оновити користувача"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordUser) return;
    if (passwordForm.password.length < 6) {
      toast.error("Пароль має містити мінімум 6 символів");
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      toast.error("Паролі не співпадають");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${passwordUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordForm.password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "password");
      }
      setUsers((prev) =>
        prev.map((user) => (user.id === passwordUser.id ? (data.user as UserRow) : user))
      );
      setPasswordForm(defaultPassword);
      setPasswordUser(null);
      toast.success("Пароль оновлено");
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, "Не вдалося змінити пароль"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAccess = async (user: UserRow) => {
    if (user.id === currentUserId) {
      toast.error("Не можна змінювати доступ для власного акаунта");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "update");
      }
      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? (data.user as UserRow) : item))
      );
      toast.success(user.isActive ? "Доступ призупинено" : "Доступ відновлено");
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, "Не вдалося оновити доступ"));
    } finally {
      setSaving(false);
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
                className="rounded-2xl bg-white/70 p-2 text-ink shadow-glass"
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

        <GlassPanel className="flex-1 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Адмін панель</p>
              <h1 className="mt-2 text-2xl font-semibold">Працівники та доступ</h1>
              <p className="mt-1 text-sm text-ink/60">
                Керуйте логінами, ролями та активністю команди в системі.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={refreshUsers}
                className="whitespace-nowrap"
              >
                <RefreshCw size={16} /> Оновити
              </Button>
              <Button
                onClick={() => setCreateOpen(true)}
                className="whitespace-nowrap"
              >
                <UserPlus size={16} /> Додати
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Input
              className="max-w-[240px]"
              placeholder="Пошук за ім'ям або логіном"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="input-surface h-12 rounded-input px-4 text-sm"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">Роль</option>
              <option value="ADMIN">Адмін</option>
              <option value="MANAGER">Менеджер</option>
              <option value="VIEWER">Перегляд</option>
            </select>
            <select
              className="input-surface h-12 rounded-input px-4 text-sm"
              value={accessFilter}
              onChange={(event) => setAccessFilter(event.target.value)}
            >
              <option value="all">Доступ</option>
              <option value="active">Активні</option>
              <option value="inactive">Заблоковані</option>
            </select>
            <select
              className="input-surface h-12 rounded-input px-4 text-sm"
              value={onlineFilter}
              onChange={(event) => setOnlineFilter(event.target.value)}
            >
              <option value="all">Онлайн</option>
              <option value="online">В мережі</option>
              <option value="offline">Офлайн</option>
            </select>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <GlassCard className="flex flex-col overflow-hidden p-0">
              <div className="max-h-[560px] overflow-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl">
                    <tr>
                      <th className="border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                        Працівник
                      </th>
                      <th className="border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                        Логін
                      </th>
                      <th className="border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                        Роль
                      </th>
                      <th className="border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                        Доступ
                      </th>
                      <th className="border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                        Статус
                      </th>
                      <th className="border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
                        Активність
                      </th>
                      <th className="border-b border-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.length ? (
                      pagedUsers.map((user) => {
                        const isOnline =
                          user.lastActiveAt &&
                          new Date(user.lastActiveAt).getTime() >=
                            clock - ONLINE_WINDOW_MS;
                        return (
                          <tr
                            key={user.id}
                            className="bg-white/50 transition hover:bg-white/80"
                            onClick={() => setSelectedId(user.id)}
                          >
                            <td className="border-b border-white/60 px-4 py-3">
                              <div>
                                <p className="font-semibold text-ink">{user.name}</p>
                                <p className="text-xs text-ink/50">{user.email ?? "—"}</p>
                              </div>
                            </td>
                            <td className="border-b border-white/60 px-4 py-3 text-ink/70">
                              {user.login}
                            </td>
                            <td className="border-b border-white/60 px-4 py-3">
                              <StatusPill label={ROLE_LABELS[user.role]} tone="neutral" />
                            </td>
                            <td className="border-b border-white/60 px-4 py-3">
                              <StatusPill
                                label={user.isActive ? "Активний" : "Заблокований"}
                                tone={user.isActive ? "success" : "danger"}
                              />
                            </td>
                            <td className="border-b border-white/60 px-4 py-3">
                              <div className="flex items-center gap-2 text-xs text-ink/60">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isOnline ? "bg-emerald-500" : "bg-slate-300"
                                  }`}
                                />
                                <span>{isOnline ? "В мережі" : "Офлайн"}</span>
                              </div>
                            </td>
                            <td className="border-b border-white/60 px-4 py-3 text-xs text-ink/60">
                              {user.lastActiveAt ? formatDateTime(user.lastActiveAt) : "—"}
                            </td>
                            <td className="border-b border-white/60 px-4 py-3">
                              <div className="relative" data-menu-root>
                                <button
                                  className="rounded-full p-2 text-ink/60 transition hover:bg-white/70 hover:text-ink"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setMenuOpenId((prev) =>
                                      prev === user.id ? null : user.id
                                    );
                                  }}
                                >
                                  <MoreVertical size={16} />
                                </button>
                                {menuOpenId === user.id && (
                                  <div className="absolute right-0 top-9 z-20 w-44 rounded-2xl border border-white/60 bg-white/90 p-2 text-sm shadow-glass backdrop-blur-xl">
                                    <button
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-ink/70 hover:bg-white/70"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setEditUser(user);
                                        setEditForm({
                                          name: user.name,
                                          login: user.login,
                                          email: user.email ?? "",
                                          role: user.role,
                                          isActive: user.isActive
                                        });
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <Pencil size={14} /> Редагувати
                                    </button>
                                    <button
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-ink/70 hover:bg-white/70"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setPasswordUser(user);
                                        setPasswordForm(defaultPassword);
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <KeyRound size={14} /> Пароль
                                    </button>
                                    <button
                                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-ink/70 hover:bg-white/70"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setMenuOpenId(null);
                                        void handleToggleAccess(user);
                                      }}
                                    >
                                      {user.isActive ? "Заблокувати" : "Активувати"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="px-4 py-8 text-center text-sm text-ink/60" colSpan={7}>
                          Немає користувачів за заданими фільтрами.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm text-ink/60">
                <span>
                  Сторінка {pageIndex + 1} з {pageCount}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-ink/70"
                    onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={pageIndex === 0}
                  >
                    Назад
                  </button>
                  <button
                    className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-medium text-ink/70"
                    onClick={() =>
                      setPageIndex((prev) => Math.min(prev + 1, pageCount - 1))
                    }
                    disabled={pageIndex >= pageCount - 1}
                  >
                    Далі
                  </button>
                </div>
              </div>
            </GlassCard>

            <div className="space-y-4">
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">У системі</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{totals.total}</p>
                <p className="text-xs text-ink/50">
                  Онлайн зараз {totals.online}
                </p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Доступ</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Активні</span>
                    <span className="text-ink/60">{totals.active}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Заблоковані</span>
                    <span className="text-ink/60">
                      {Math.max(0, totals.total - totals.active)}
                    </span>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Ролі</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Адміни</span>
                    <span className="text-ink/60">{totals.admins}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Менеджери</span>
                    <span className="text-ink/60">{totals.managers}</span>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Обраний</p>
                {selectedUser ? (
                  <div className="mt-3 space-y-2 text-sm text-ink/70">
                    <p className="text-base font-semibold text-ink">{selectedUser.name}</p>
                    <p>Логін: {selectedUser.login}</p>
                    <p>Email: {selectedUser.email ?? "—"}</p>
                    <p>Роль: {ROLE_LABELS[selectedUser.role]}</p>
                    <p>
                      Останній вхід:{" "}
                      {selectedUser.lastLoginAt
                        ? formatDateTime(selectedUser.lastLoginAt)
                        : "—"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink/60">Оберіть користувача</p>
                )}
              </GlassCard>
            </div>
          </div>
        </GlassPanel>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Додати користувача">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-ink/60">Ім&apos;я та прізвище</label>
            <Input
              className="mt-2"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Напр. Олена Іваненко"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-ink/60">Логін</label>
              <Input
                className="mt-2"
                value={createForm.login}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, login: event.target.value }))
                }
                placeholder="ole.ivanenko"
              />
            </div>
            <div>
              <label className="text-xs text-ink/60">Email</label>
              <Input
                className="mt-2"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="mail@example.com"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-ink/60">Роль</label>
              <select
                className="input-surface mt-2 h-12 w-full rounded-input px-4 text-sm"
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    role: event.target.value as UserRow["role"]
                  }))
                }
              >
                <option value="ADMIN">Адмін</option>
                <option value="MANAGER">Менеджер</option>
                <option value="VIEWER">Перегляд</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ink/60">Доступ</label>
              <select
                className="input-surface mt-2 h-12 w-full rounded-input px-4 text-sm"
                value={createForm.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    isActive: event.target.value === "active"
                  }))
                }
              >
                <option value="active">Активний</option>
                <option value="inactive">Заблокований</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-ink/60">Пароль</label>
              <Input
                className="mt-2"
                type="password"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Мінімум 6 символів"
              />
            </div>
            <div>
              <label className="text-xs text-ink/60">Повторіть пароль</label>
              <Input
                className="mt-2"
                type="password"
                value={createForm.confirm}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, confirm: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              className="text-xs font-medium text-ink/70 underline underline-offset-4"
              onClick={() => {
                const pwd = generatePassword();
                setCreateForm((prev) => ({ ...prev, password: pwd, confirm: pwd }));
              }}
            >
              Згенерувати пароль
            </button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Збереження..." : "Створити користувача"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editUser)}
        onClose={() => {
          setEditUser(null);
          setEditForm(null);
        }}
        title="Редагувати дані"
      >
        {editForm && editUser && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-ink/60">Ім&apos;я та прізвище</label>
              <Input
                className="mt-2"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-ink/60">Логін</label>
                <Input
                  className="mt-2"
                  value={editForm.login}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, login: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div>
                <label className="text-xs text-ink/60">Email</label>
                <Input
                  className="mt-2"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, email: event.target.value } : prev
                    )
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-ink/60">Роль</label>
                <select
                  className="input-surface mt-2 h-12 w-full rounded-input px-4 text-sm"
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev
                        ? { ...prev, role: event.target.value as UserRow["role"] }
                        : prev
                    )
                  }
                  disabled={editUser.id === currentUserId}
                >
                  <option value="ADMIN">Адмін</option>
                  <option value="MANAGER">Менеджер</option>
                  <option value="VIEWER">Перегляд</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-ink/60">Доступ</label>
                <select
                  className="input-surface mt-2 h-12 w-full rounded-input px-4 text-sm"
                  value={editForm.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev
                        ? { ...prev, isActive: event.target.value === "active" }
                        : prev
                    )
                  }
                  disabled={editUser.id === currentUserId}
                >
                  <option value="active">Активний</option>
                  <option value="inactive">Заблокований</option>
                </select>
              </div>
            </div>
            {editUser.id === currentUserId && (
              <p className="text-xs text-ink/50">
                Власний акаунт не можна заблокувати або змінити роль.
              </p>
            )}
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Збереження..." : "Зберегти зміни"}
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(passwordUser)}
        onClose={() => {
          setPasswordUser(null);
          setPasswordForm(defaultPassword);
        }}
        title="Змінити пароль"
      >
        {passwordUser && (
          <div className="space-y-4">
            <p className="text-sm text-ink/60">
              Користувач: <span className="font-semibold text-ink">{passwordUser.name}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-ink/60">Новий пароль</label>
                <Input
                  className="mt-2"
                  type="password"
                  value={passwordForm.password}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-ink/60">Повторіть пароль</label>
                <Input
                  className="mt-2"
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                className="text-xs font-medium text-ink/70 underline underline-offset-4"
                onClick={() => {
                  const pwd = generatePassword();
                  setPasswordForm({ password: pwd, confirm: pwd });
                }}
              >
                Згенерувати пароль
              </button>
              <Button onClick={handlePasswordReset} disabled={saving}>
                {saving ? "Збереження..." : "Оновити пароль"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
