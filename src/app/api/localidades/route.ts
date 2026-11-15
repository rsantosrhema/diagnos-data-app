import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { UF_SIGLAS } from "@/lib/localidades/estados";
import {
  createLocalidadesService,
  LocalidadesServiceError,
} from "@/lib/service/localidades-service";

const ufSchema = z.enum(UF_SIGLAS);

export async function GET(req: Request) {
  if (!verifyInternalApiKey(req)) {
    return NextResponse.json({ error: "Chave interna inválida" }, { status: 401 });
  }

  const uf = new URL(req.url).searchParams.get("uf");
  const parsed = ufSchema.safeParse(uf);
  if (!parsed.success) {
    return NextResponse.json({ error: "UF inválida" }, { status: 400 });
  }

  try {
    const municipios = await createLocalidadesService().listMunicipios(parsed.data);
    return NextResponse.json({ municipios }, { status: 200 });
  } catch (err) {
    if (err instanceof LocalidadesServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[localidades] falha inesperada ao listar municípios:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
