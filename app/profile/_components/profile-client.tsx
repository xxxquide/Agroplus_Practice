"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Map as MapIcon,
  Warehouse,
  FileText,
  Users,
  Settings,
  LifeBuoy,
  Camera,
  Trash2,
  BadgeCheck,
  MapPin,
  Briefcase,
  Save,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { type ProfileData } from "@/lib/profile";
import { GlassCard, GlassPanel } from "@/components/ui/glass";
import { IconRail } from "@/components/ui/icon-rail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatingDock } from "@/components/ui/floating-dock";
import { StatusPill } from "@/components/ui/status-pill";

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export function ProfileClient({
  initialProfile,
  defaultProfile
}: {
  initialProfile: ProfileData;
  defaultProfile: ProfileData;
}) {
  const router = useRouter();
  const [profile, setProfile] = React.useState<ProfileData>(initialProfile);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = React.useRef(true);

  React.useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const persistProfile = React.useCallback(
    async (nextProfile: ProfileData, notify?: boolean) => {
      setSaving(true);
      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextProfile)
        });
        if (!response.ok) throw new Error();
        if (notify) toast.success("Профіль збережено");
      } catch {
        if (notify) toast.error("Не вдалося зберегти профіль");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistProfile(profile);
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [profile, persistProfile]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Дозволені лише PNG або JPG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Файл завеликий (макс. 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, avatar: reader.result as string }));
      toast.success("Аватар оновлено");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => persistProfile(profile, true);
  const handleReset = () => {
    setProfile(defaultProfile);
    persistProfile(defaultProfile, true);
    toast.message("Повернули стандартні дані профілю");
  };

  const handleSync = async () => {
    try {
      const response = await fetch("/api/profile");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setProfile(data.profile);
      toast.message("Дані синхронізовано");
    } catch {
      toast.error("Не вдалося синхронізувати");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/login");
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
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Огляд</p>
            <div className="mt-3 space-y-3">
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Статус</p>
                <p className="mt-2 text-sm font-semibold">{profile.status}</p>
                <p className="text-xs text-ink/50">Оновлено щойно</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Роль</p>
                <p className="mt-2 text-sm font-semibold">{profile.role}</p>
                <p className="text-xs text-ink/50">{profile.department}</p>
              </GlassCard>
              <GlassCard className="p-4">
                <p className="text-xs text-ink/60">Локація</p>
                <p className="mt-2 text-sm font-semibold">{profile.location}</p>
                <p className="text-xs text-ink/50">Часовий пояс {profile.timezone}</p>
              </GlassCard>
            </div>
          </div>
        </aside>

        <GlassPanel className="flex-1 rounded-[32px] p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
                Профіль / Profile
              </p>
              <h1 className="text-2xl font-semibold">Особистий профіль</h1>
            </div>
            <StatusPill
              label={saving ? "Збереження..." : "Автозбереження"}
              tone={saving ? "warning" : "success"}
            />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <GlassCard className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full bg-white/70">
                      {profile.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink/70">
                          {getInitials(profile.name) || "AD"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{profile.name}</p>
                      <p className="text-xs text-ink/50">{profile.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Camera size={14} /> Змінити фото
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProfile((prev) => ({ ...prev, avatar: null }))}
                    >
                      <Trash2 size={14} /> Видалити
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-ink/60">
                    Імʼя
                    <Input
                      className="mt-2"
                      value={profile.name}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Роль
                    <Input
                      className="mt-2"
                      value={profile.role}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, role: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Відділ
                    <Input
                      className="mt-2"
                      value={profile.department}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, department: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Телефон
                    <Input
                      className="mt-2"
                      value={profile.phone}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60 sm:col-span-2">
                    Email
                    <Input
                      className="mt-2"
                      value={profile.email}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </label>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Про мене</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-ink/60">
                    Локація
                    <Input
                      className="mt-2"
                      value={profile.location}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, location: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60">
                    Часовий пояс
                    <Input
                      className="mt-2"
                      value={profile.timezone}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, timezone: event.target.value }))
                      }
                    />
                  </label>
                  <label className="text-xs text-ink/60 sm:col-span-2">
                    Коротка біографія
                    <textarea
                      className="input-surface mt-2 h-24 w-full rounded-input px-4 py-3 text-sm text-ink placeholder:text-ink/40"
                      value={profile.bio}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, bio: event.target.value }))
                      }
                    />
                  </label>
                </div>
              </GlassCard>
            </div>

            <div className="space-y-5">
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Статус доступу</h3>
                <div className="mt-4 space-y-3 text-sm text-ink/60">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BadgeCheck size={16} /> Верифіковано
                    </span>
                    <StatusPill label="Активний" tone="success" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Briefcase size={16} /> Робочий статус
                    </span>
                    <Input
                      className="h-9 w-28 text-center"
                      value={profile.status}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, status: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin size={16} /> Місце роботи
                    </span>
                    <span>{profile.location}</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Переваги</h3>
                <div className="mt-4 space-y-3">
                  <label className="text-xs text-ink/60">
                    Мова
                    <Input
                      className="mt-2"
                      value={profile.language}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, language: event.target.value }))
                      }
                    />
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                  >
                    <Sparkles size={14} /> Синхронізувати дані
                  </Button>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold">Підказки</h3>
                <div className="mt-3 space-y-2 text-xs text-ink/60">
                  <p>1. Аватар видно на головній панелі.</p>
                  <p>2. Дані профілю зберігаються в базі та доступні на всіх пристроях.</p>
                  <p>3. Адміністратор керує доступами.</p>
                </div>
              </GlassCard>
            </div>
          </div>

          <FloatingDock className="mt-8">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} /> Зберегти
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw size={14} /> Скинути
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSync}
            >
              <Sparkles size={14} /> Синхронізація
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-200/70 text-red-700 hover:bg-red-50/70"
              onClick={handleLogout}
            >
              Вийти
            </Button>
          </FloatingDock>
        </GlassPanel>
      </div>
    </div>
  );
}
