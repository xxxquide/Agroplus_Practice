export type SettingsData = {
  profile: {
    name: string;
    role: string;
    department: string;
    phone: string;
    email: string;
  };
  org: {
    company: string;
    region: string;
    baseLocation: string;
    currency: string;
  };
  preferences: {
    language: string;
    timezone: string;
    weekStart: string;
    units: string;
    tempUnit: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    reports: boolean;
    weather: boolean;
    machinery: boolean;
    inventory: boolean;
    dailyDigest: boolean;
  };
  access: {
    approvals: boolean;
    dataRetention: string;
  };
  integrations: {
    weatherSource: string;
    ratesSource: string;
    fuelSource: string;
  };
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Адмін",
  MANAGER: "Менеджер",
  VIEWER: "Перегляд"
};

export const DEFAULT_SETTINGS: SettingsData = {
  profile: {
    name: "Адміністратор",
    role: "Адмін",
    department: "Операційний штаб",
    phone: "+380 67 123 45 67",
    email: "admin@agroplus.local"
  },
  org: {
    company: "АГРОПЛЮС",
    region: "Вінницька область",
    baseLocation: "Вінниця, Україна",
    currency: "UAH"
  },
  preferences: {
    language: "Українська",
    timezone: "Europe/Kyiv",
    weekStart: "Понеділок",
    units: "Метрична система",
    tempUnit: "°C"
  },
  notifications: {
    email: true,
    push: true,
    reports: true,
    weather: true,
    machinery: false,
    inventory: true,
    dailyDigest: true
  },
  access: {
    approvals: true,
    dataRetention: "12"
  },
  integrations: {
    weatherSource: "Open-Meteo",
    ratesSource: "НБУ",
    fuelSource: "Ручне оновлення"
  }
};

export function buildDefaultSettings(user?: {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}): SettingsData {
  const roleLabel = user?.role ? ROLE_LABELS[user.role] ?? DEFAULT_SETTINGS.profile.role : DEFAULT_SETTINGS.profile.role;
  return {
    ...DEFAULT_SETTINGS,
    profile: {
      ...DEFAULT_SETTINGS.profile,
      name: user?.name ?? DEFAULT_SETTINGS.profile.name,
      email: user?.email ?? DEFAULT_SETTINGS.profile.email,
      role: roleLabel
    }
  };
}

export function mergeSettingsData(
  user: { name: string; email?: string | null; role?: string | null } | null,
  stored?: unknown
): SettingsData {
  const base = buildDefaultSettings(user ?? undefined);
  const parsed = stored && typeof stored === "object" ? (stored as Partial<SettingsData>) : {};
  const merged = {
    ...base,
    ...parsed,
    profile: {
      ...base.profile,
      ...(parsed.profile ?? {})
    },
    org: {
      ...base.org,
      ...(parsed.org ?? {})
    },
    preferences: {
      ...base.preferences,
      ...(parsed.preferences ?? {})
    },
    notifications: {
      ...base.notifications,
      ...(parsed.notifications ?? {})
    },
    access: {
      ...base.access,
      ...(parsed.access ?? {})
    },
    integrations: {
      ...base.integrations,
      ...(parsed.integrations ?? {})
    }
  } as SettingsData;

  if (user?.name) merged.profile.name = user.name;
  if (user?.email) merged.profile.email = user.email;
  if (user?.role) merged.profile.role = ROLE_LABELS[user.role] ?? merged.profile.role;
  return merged;
}
