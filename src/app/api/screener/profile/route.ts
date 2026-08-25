import { NextResponse } from "next/server";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { readLeadFromSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  const session = await readLeadFromSession(req);
  if (!session) {
    return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
  }

  return NextResponse.json(
    {
      id: session.lead.id,
      name: session.lead.name,
      email: session.lead.email,
      company: session.lead.company,
      role: session.lead.role,
      status: session.lead.status,
      isMaster: session.isMaster,
    },
    { status: 200 },
  );
}
