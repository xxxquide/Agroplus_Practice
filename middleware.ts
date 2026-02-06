import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySessionTokenEdge } from "@/lib/auth-edge";
import { isIpAllowed } from "@/lib/ip";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const allowlistRaw = process.env.VPN_ALLOWLIST;
  if (allowlistRaw) {
    const allowlist = allowlistRaw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() ?? req.ip ?? "";
    if (!isIpAllowed(ip, allowlist)) {
      return new NextResponse("Access denied", { status: 403 });
    }
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("agroplus_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await verifySessionTokenEdge(token);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
