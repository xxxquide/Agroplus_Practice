import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.isActive) return null;
  return { user, session };
}

export async function requireUser() {
  const auth = await getSessionUser();
  if (!auth) return null;
  return auth.user;
}

export async function requireAdmin() {
  const auth = await getSessionUser();
  if (!auth) return null;
  if (auth.user.role !== "ADMIN") return null;
  return auth.user;
}

export async function requireManagerOrAdmin() {
  const auth = await getSessionUser();
  if (!auth) return null;
  if (auth.user.role === "VIEWER") return null;
  return auth.user;
}
