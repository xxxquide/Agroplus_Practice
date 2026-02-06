type IPv4Tuple = [number, number, number, number];

const normalizeIp = (raw: string) => {
  if (!raw) return "";
  if (raw.startsWith("::ffff:")) return raw.replace("::ffff:", "");
  return raw;
};

export const parseIPv4 = (raw: string): IPv4Tuple | null => {
  const ip = normalizeIp(raw.trim());
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null;
  return [nums[0], nums[1], nums[2], nums[3]];
};

const toInt = (ip: IPv4Tuple) =>
  ((ip[0] << 24) >>> 0) + (ip[1] << 16) + (ip[2] << 8) + ip[3];

export const inCidr = (rawIp: string, cidr: string) => {
  const [block, maskRaw] = cidr.split("/");
  const mask = Number(maskRaw ?? 32);
  if (!Number.isFinite(mask) || mask < 0 || mask > 32) return false;
  const ip = parseIPv4(rawIp);
  const blockIp = parseIPv4(block);
  if (!ip || !blockIp) return false;
  const ipInt = toInt(ip);
  const blockInt = toInt(blockIp);
  const maskInt = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
  return (ipInt & maskInt) === (blockInt & maskInt);
};

export const isIpAllowed = (rawIp: string, allowlist: string[]) => {
  if (!rawIp) return false;
  const ip = normalizeIp(rawIp);
  if (ip === "::1") return true;
  if (allowlist.length === 0) return true;
  for (const entry of allowlist) {
    const value = entry.trim();
    if (!value) continue;
    if (value.includes("/")) {
      if (inCidr(ip, value)) return true;
      continue;
    }
    if (normalizeIp(value) === ip) return true;
  }
  return false;
};
