import { z } from "zod";

export const reprocessAnalysisSchema = z
  .object({
    leadId: z.string().uuid("leadId inválido"),
  })
  .strict();
