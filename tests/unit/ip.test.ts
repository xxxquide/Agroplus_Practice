import { describe, expect, it } from "vitest";
import { isIpAllowed } from "@/lib/ip";

describe("isIpAllowed", () => {
  it("allows localhost loopback", () => {
    expect(isIpAllowed("::1", ["10.0.0.0/24"])).toBe(true);
  });

  it("allows when allowlist is empty", () => {
    expect(isIpAllowed("192.168.1.12", [])).toBe(true);
  });

  it("matches single IP and CIDR", () => {
    expect(isIpAllowed("10.8.0.5", ["10.8.0.0/24"])).toBe(true);
    expect(isIpAllowed("10.8.1.5", ["10.8.0.0/24"])).toBe(false);
    expect(isIpAllowed("203.0.113.10", ["203.0.113.10"])).toBe(true);
  });
});
