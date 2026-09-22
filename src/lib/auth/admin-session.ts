import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isManagerEmail } from "@/lib/auth/guard";

export const ADMIN_ACCESS_COOKIE = "diagnos_admin_at";
export const ADMIN_REFRESH_COOKIE = "diagnos_admin_rt";

const ACCESS_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

interface AdminSession {
  userId: string;
  email?: string;
}

function getEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase não configurado");
  return { url, anonKey };
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

async function setSessionCookies(accessToken: string, refreshToken: string): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.set(ADMIN_REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_ACCESS_COOKIE, "", cookieOptions(0));
  store.set(ADMIN_REFRESH_COOKIE, "", cookieOptions(0));
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<{ ok: true; email?: string } | { ok: false; error: string }> {
  const { url, anonKey } = getEnv();
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session || !data.user) {
    return { ok: false, error: "Email ou senha inválidos" };
  }

  if (!isManagerEmail(data.user.email)) {
    return { ok: false, error: "Acesso restrito a gerentes" };
  }

  await setSessionCookies(data.session.access_token, data.session.refresh_token);
  return { ok: true, email: data.user.email ?? undefined };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const access = store.get(ADMIN_ACCESS_COOKIE)?.value;
  if (!access) return null;

  const { url, anonKey } = getEnv();
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(access);
  if (error || !data.user) return null;

  return { userId: data.user.id, email: data.user.email ?? undefined };
}

export async function refreshAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const refresh = store.get(ADMIN_REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  const { url, anonKey } = getEnv();
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refresh });
  if (error || !data.session || !data.user) return null;

  await setSessionCookies(data.session.access_token, data.session.refresh_token);
  return { userId: data.user.id, email: data.user.email ?? undefined };
}

export async function logoutAdmin(): Promise<void> {
  const store = await cookies();
  const refresh = store.get(ADMIN_REFRESH_COOKIE)?.value;
  if (refresh) {
    try {
      const { url, anonKey } = getEnv();
      const supabase = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // logout best-effort
    }
  }
  await clearSessionCookies();
}
