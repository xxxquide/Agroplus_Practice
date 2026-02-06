import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: true });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ ok: true });
  }

  const result = await prisma.user.updateMany({
    where: { id: session.uid },
    data: { lastActiveAt: new Date() }
  });
  if (result.count === 0) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
