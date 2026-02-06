import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildDefaultSettings, mergeSettingsData, type SettingsData } from "@/lib/settings";
import { mergeProfileData } from "@/lib/profile";

const settingsSchema = z.object({
  profile: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    department: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().min(3)
  }),
  org: z.object({
    company: z.string().min(1),
    region: z.string().min(1),
    baseLocation: z.string().min(1),
    currency: z.string().min(1)
  }),
  preferences: z.object({
    language: z.string().min(1),
    timezone: z.string().min(1),
    weekStart: z.string().min(1),
    units: z.string().min(1),
    tempUnit: z.string().min(1)
  }),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    reports: z.boolean(),
    weather: z.boolean(),
    machinery: z.boolean(),
    inventory: z.boolean(),
    dailyDigest: z.boolean()
  }),
  access: z.object({
    approvals: z.boolean(),
    dataRetention: z.string().min(1)
  }),
  integrations: z.object({
    weatherSource: z.string().min(1),
    ratesSource: z.string().min(1),
    fuelSource: z.string().min(1)
  })
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const settings = mergeSettingsData(user, user.settingsData);
  const defaults = buildDefaultSettings(user);
  return NextResponse.json({ settings, defaults });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = settingsSchema.parse(json) as SettingsData;
    const existingProfile = mergeProfileData(user, user.profileData);
    const syncedProfile = {
      ...existingProfile,
      name: parsed.profile.name,
      role: parsed.profile.role,
      department: parsed.profile.department,
      phone: parsed.profile.phone,
      email: parsed.profile.email
    };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.profile.name,
        email: parsed.profile.email || null,
        settingsData: parsed,
        profileData: syncedProfile
      }
    });
    return NextResponse.json({ settings: parsed });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export const runtime = "nodejs";
