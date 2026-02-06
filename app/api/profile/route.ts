import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { buildDefaultProfile, mergeProfileData, type ProfileData } from "@/lib/profile";

const profileSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  department: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().min(3),
  location: z.string().min(1),
  bio: z.string().optional().default(""),
  timezone: z.string().min(1),
  language: z.string().min(1),
  status: z.string().min(1),
  avatar: z.string().nullable().optional()
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const profile = mergeProfileData(user, user.profileData);
  const defaults = buildDefaultProfile(user);
  return NextResponse.json({ profile, defaults });
}

export async function PUT(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const json = await request.json();
    const parsed = profileSchema.parse(json) as ProfileData;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.name,
        email: parsed.email || null,
        profileData: parsed
      }
    });
    return NextResponse.json({ profile: parsed });
  } catch {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }
}

export const runtime = "nodejs";
