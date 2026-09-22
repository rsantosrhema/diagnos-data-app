import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import "server-only";

const MANAGER_ALLOWLIST_ENV = "MANAGER_EMAILS";

export function isManagerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env[MANAGER_ALLOWLIST_ENV] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return true;
  return allowlist.includes(email.toLowerCase());
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

export function getAdminAccessToken(req: Request): string | null {
  const cookieToken = getCookie(req, "diagnos_admin_at");
  if (cookieToken) return cookieToken;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function requireManager(req: Request): Promise<{ id: string; email?: string } | null> {
  const token = getAdminAccessToken(req);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  if (!isManagerEmail(data.user.email)) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}
