import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMITED_PATHS = [
  "/api/public-proxy/leads",
  "/api/public-proxy/screener",
  "/api/admin-proxy/session",
  "/api/admin-proxy/dashboard",
  "/api/admin-proxy/analysis/reprocess",
];

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/public-proxy/leads": { limit: 5, windowMs: 10 * 60 * 1000 },
  "/api/public-proxy/screener": { limit: 5, windowMs: 10 * 60 * 1000 },
  "/api/admin-proxy/session": { limit: 10, windowMs: 10 * 60 * 1000 },
  "/api/admin-proxy/dashboard": { limit: 60, windowMs: 60 * 1000 },
  "/api/admin-proxy/analysis/reprocess": { limit: 10, windowMs: 60 * 1000 },
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
  matcher: ["/api/public-proxy/:path*", "/api/admin-proxy/:path*"],
};

function getClientIp(req: NextRequest): string {
  // Em produção o app roda atrás do Traefik (Coolify), que sobrescreve
  // x-real-ip com o IP da conexão (o cliente real) — por isso ele é a fonte
  // primária. x-forwarded-for é controlável pelo cliente; usamos apenas como
  // fallback a ÚLTIMA entrada (a acrescentada pelo proxy).
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return "unknown";
}
