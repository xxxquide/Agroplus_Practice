import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

type UserRole = "ADMIN" | "MANAGER" | "VIEWER";
type UserRow = {
  id: string;
  login: string;
  email: string | null;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
};

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  login: z.string().min(3).optional(),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional()
});

function toUserResponse(user: UserRow) {
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Невірні дані" }, { status: 400 });
  }

  if (id === session.uid) {
    if (payload.isActive === false) {
      return NextResponse.json(
        { error: "Не можна заблокувати власний акаунт" },
        { status: 400 }
      );
    }
    if (payload.role && payload.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Не можна змінити власну роль" },
        { status: 400 }
      );
    }
  }

  const data: {
    name?: string;
    login?: string;
    email?: string | null;
    role?: UserRole;
    isActive?: boolean;
    passwordHash?: string;
  } = {};

  if (payload.name !== undefined) data.name = payload.name.trim();
  if (payload.login !== undefined) data.login = payload.login.trim();
  if (payload.email !== undefined) {
    const email = payload.email.trim();
    data.email = email ? email : null;
  }
  if (payload.role !== undefined) data.role = payload.role;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  if (payload.password) {
    data.passwordHash = await hash(payload.password, 10);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data
    });
    return NextResponse.json({ user: toUserResponse(user) });
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "P2002") {
      return NextResponse.json(
        { error: "Логін або email вже використовується" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Не вдалося оновити користувача" }, { status: 500 });
  }
}
