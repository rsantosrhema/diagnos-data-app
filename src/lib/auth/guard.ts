import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function requireManager(req: Request): Promise<{ id: string; email?: string } | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}
