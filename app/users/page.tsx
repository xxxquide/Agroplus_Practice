import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { UsersClient } from "./_components/users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <UsersClient
      currentUserId={session.uid}
      initialUsers={users.map((user: typeof users[number]) => ({
        id: user.id,
        login: user.login,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        lastActiveAt: user.lastActiveAt ? user.lastActiveAt.toISOString() : null
      }))}
    />
  );
}
