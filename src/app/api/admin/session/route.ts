import { NextResponse } from "next/server";
import { loginAdmin, getAdminSession, refreshAdminSession, logoutAdmin } from "@/lib/auth/admin-session";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email e senha obrigatórios" }, { status: 400 });
  }

  try {
    const result = await loginAdmin(email, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json(
      { authenticated: true, email: result.email ?? null },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getAdminSession();
    if (session) {
      return NextResponse.json(
        { authenticated: true, email: session.email ?? null },
        { status: 200 },
      );
    }

    const refreshed = await refreshAdminSession();
    if (refreshed) {
      return NextResponse.json(
        { authenticated: true, email: refreshed.email ?? null },
        { status: 200 },
      );
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    await logoutAdmin();
  } catch {
    // logout best-effort
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
