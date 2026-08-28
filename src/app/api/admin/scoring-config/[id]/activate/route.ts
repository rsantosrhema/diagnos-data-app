import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createScoringConfigRepository } from "@/lib/repository/scoring-config-repo";
import { createScoringConfigService, ScoringConfigServiceError } from "@/lib/service/scoring-config-service";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const configRepo = createScoringConfigRepository(supabase);
  const configService = createScoringConfigService({ configRepo });

  try {
    await configService.activateCalibrationVersion(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof ScoringConfigServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
