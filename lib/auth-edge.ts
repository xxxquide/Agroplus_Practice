export type SessionPayload = {
  uid: string;
  role: string;
  exp: number;
};

const secret = process.env.AUTH_SECRET ?? "dev-secret";
const encoder = new TextEncoder();

function base64urlEncode(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return atob(padded);
}

async function sign(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64urlEncode(signature);
}

export async function verifySessionTokenEdge(token: string): Promise<SessionPayload | null> {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = await sign(data);
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(base64urlDecode(data)) as SessionPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
