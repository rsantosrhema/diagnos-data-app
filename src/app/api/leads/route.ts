import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { leadSchema, sanitizeText } from "@/lib/schemas/lead";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createLeadService, LeadServiceError } from "@/lib/service/lead-service";

export async function POST(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.website && parsed.data.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const supabase = getServiceClient();
  const leadService = createLeadService({ leadRepo: createLeadRepository(supabase) });

  try {
    const result = await leadService.createLead({
      name: sanitizeText(parsed.data.name),
      company: sanitizeText(parsed.data.company),
      phone: sanitizeText(parsed.data.phone),
      email: parsed.data.email.trim().toLowerCase(),
      role: sanitizeText(parsed.data.role),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof LeadServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro ao salvar cadastro" }, { status: 500 });
  }
}
