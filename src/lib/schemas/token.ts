import { z } from "zod";

export const validateTokenSchema = z.object({
  token: z.string().trim().min(1, "Token obrigatório"),
});

export const generateTokenSchema = z.object({
  leadId: z.string().uuid("leadId inválido"),
});
