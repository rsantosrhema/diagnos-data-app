import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { createScoringConfigRepository } from "@/lib/repository/scoring-config-repo";
import { createScoringConfigService, ScoringConfigServiceError } from "@/lib/service/scoring-config-service";

export async function GET(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const configRepo = createScoringConfigRepository(supabase);
  const configService = createScoringConfigService({ configRepo });

  try {
    const versions = await configService.listVersions();
    return NextResponse.json(versions, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

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

  const { version, config } = body as { version?: string; config?: unknown };
  if (!version || !config) {
    return NextResponse.json(
      { error: "Campos obrigatórios: version, config" },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();
  const configRepo = createScoringConfigRepository(supabase);
  const configService = createScoringConfigService({ configRepo });

  try {
    const result = await configService.createCalibrationVersion(version, config);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ScoringConfigServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
