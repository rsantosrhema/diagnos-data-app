import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMITED_PATHS = [
  "/api/public-proxy/leads",
  "/api/public-proxy/tokens/validate",
  "/api/public-proxy/screener",
  "/api/public-proxy/sessions/logout",
];

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/public-proxy/leads": { limit: 5, windowMs: 10 * 60 * 1000 },
  "/api/public-proxy/tokens/validate": { limit: 10, windowMs: 10 * 60 * 1000 },
  "/api/public-proxy/screener": { limit: 5, windowMs: 10 * 60 * 1000 },
  "/api/public-proxy/screener/profile": { limit: 20, windowMs: 10 * 60 * 1000 },
  "/api/public-proxy/sessions/logout": { limit: 10, windowMs: 10 * 60 * 1000 },
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  for (const path of RATE_LIMITED_PATHS) {
    if (pathname.startsWith(path)) {
      const config = RATE_LIMITS[path];
      const rl = checkRateLimit(`${path}:${ip}`, config.limit, config.windowMs);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Muitas tentativas. Tente novamente em alguns minutos." },
          {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfterSeconds ?? 600) },
          },
        );
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/public-proxy/:path*"],
};

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
