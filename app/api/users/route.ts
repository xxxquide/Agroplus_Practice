import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { hash } from "bcryptjs";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(2),
  login: z.string().min(3),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]),
  password: z.string().min(6),
  isActive: z.boolean().optional()
});

function toUserResponse(user: User) {
  return {
    id: user.id,
    login: user.login,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : null
  };
}

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session) return null;
  const dbUser = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { role: true, isActive: true }
  });
  if (!dbUser || !dbUser.isActive || dbUser.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ users: users.map(toUserResponse) });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Невірні дані" }, { status: 400 });
  }

  const email = payload.email?.trim();
  const passwordHash = await hash(payload.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name: payload.name.trim(),
        login: payload.login.trim(),
        email: email ? email : null,
        role: payload.role,
        passwordHash,
        isActive: payload.isActive ?? true
      }
    });

    return NextResponse.json({ user: toUserResponse(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Логін або email вже використовується" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Не вдалося створити користувача" }, { status: 500 });
  }
}
