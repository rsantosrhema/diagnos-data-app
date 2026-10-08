import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
import { resetAllRateLimits } from "@/lib/rate-limit";

const PORTAL_LIMIT = 30;

function portalReq(ip = "203.0.113.7", token = "tok-1"): NextRequest {
  return new NextRequest(`http://localhost/api/public-proxy/portal/${token}`, {
    headers: { "x-real-ip": ip },
  });
}

describe("middleware rate limit (PORTAL-09)", () => {
  beforeEach(() => resetAllRateLimits());

  it("permite até 30 requisições por minuto ao endpoint do portal", () => {
    for (let i = 1; i <= PORTAL_LIMIT; i++) {
      const res = middleware(portalReq());
      expect(res.status).not.toBe(429);
    }
  });

  it("responde 429 com Retry-After ao exceder 30 requisições", () => {
    for (let i = 1; i <= PORTAL_LIMIT; i++) middleware(portalReq());
    const blocked = middleware(portalReq());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    const body = blocked.body;
    expect(body).toBeTruthy();
  });

  it("não bloqueia IPs diferentes na mesma janela", () => {
    for (let i = 1; i <= PORTAL_LIMIT; i++) middleware(portalReq("203.0.113.7"));
    const other = middleware(portalReq("198.51.100.9"));
    expect(other.status).not.toBe(429);
  });
});
