import { NextResponse } from "next/server";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { logoutSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  await logoutSession(req);

  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
  return res;
}
