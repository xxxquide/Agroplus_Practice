export type ProfileData = {
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  location: string;
  bio: string;
  timezone: string;
  language: string;
  status: string;
  avatar: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Адмін",
  MANAGER: "Менеджер",
  VIEWER: "Перегляд"
};

export const DEFAULT_PROFILE: ProfileData = {
  name: "Адміністратор",
  role: "Адмін",
  department: "Операційний штаб",
  phone: "+380 67 123 45 67",
  email: "admin@agroplus.local",
  location: "Вінниця, Україна",
  bio: "Координую операційну діяльність, відповідаю за якість даних та контроль процесів.",
  timezone: "Europe/Kyiv",
  language: "Українська",
  status: "Доступний",
  avatar: null
};

export function buildDefaultProfile(user?: {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}): ProfileData {
  const roleLabel = user?.role ? ROLE_LABELS[user.role] ?? DEFAULT_PROFILE.role : DEFAULT_PROFILE.role;
  return {
    ...DEFAULT_PROFILE,
    name: user?.name ?? DEFAULT_PROFILE.name,
    email: user?.email ?? DEFAULT_PROFILE.email,
    role: roleLabel
  };
}

export function mergeProfileData(
  user: { name: string; email?: string | null; role?: string | null } | null,
  stored?: unknown
): ProfileData {
  const base = buildDefaultProfile(user ?? undefined);
  const parsed = stored && typeof stored === "object" ? (stored as Partial<ProfileData>) : {};
  const merged = { ...base, ...parsed };
  if (user?.name) merged.name = user.name;
  if (user?.email) merged.email = user.email;
  if (user?.role) merged.role = ROLE_LABELS[user.role] ?? merged.role;
  return merged;
}
