import { NextResponse } from "next/server";

export function unauthorized(message = "Chave interna inválida"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}
