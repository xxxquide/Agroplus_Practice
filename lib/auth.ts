import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "agroplus_session";

export type SessionPayload = {
  uid: string;
  role: string;
  exp: number;
};

const secret = process.env.AUTH_SECRET ?? "dev-secret";
function base64url(input: string | Buffer) {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(input: string) {
  return base64url(createHmac("sha256", secret).update(input).digest());
}

function decodeBase64url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

export function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  ttlHours = 12
) {
  const exp = Date.now() + ttlHours * 60 * 60 * 1000;
  const data = base64url(JSON.stringify({ ...payload, exp }));
  const sig = sign(data);
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = sign(data);
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, sigBuf)) return null;
  try {
    const payload = JSON.parse(decodeBase64url(data).toString("utf8")) as SessionPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
