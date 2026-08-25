import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { screenerSubmissionSchema } from "@/lib/schemas/screener";
import { verifyInternalApiKey } from "@/lib/auth/internal-key";
import { readLeadFromSession } from "@/lib/auth/session";
import { createLeadRepository } from "@/lib/repository/lead-repo";
import { createAssessmentRepository } from "@/lib/repository/assessment-repo";
import { createScreenService, ScreenServiceError } from "@/lib/service/screen-service";
import { SCREENER_CONTRACT } from "@/lib/screener/contract";
import { generateScreenerPdf } from "@/lib/report/report-generator";
import { sendReportEmail } from "@/lib/email/send-report";

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

  const parsed = screenerSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const session = await readLeadFromSession(req);
  const isMaster = session?.isMaster ?? false;

  const supabase = getServiceClient();
  const screenService = createScreenService({
    leadRepo: createLeadRepository(supabase),
    assessmentRepo: createAssessmentRepository(supabase),
    contract: SCREENER_CONTRACT,
    generatePdf: generateScreenerPdf,
    sendEmail: sendReportEmail,
  });

  try {
    const result = await screenService.submitScreener(parsed.data, { isMaster });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ScreenServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
