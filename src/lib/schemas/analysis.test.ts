import { describe, it, expect } from "vitest";
import { reprocessAnalysisSchema } from "./analysis";

const VALID_UUID = "c0b1f2e3-4a5b-6c7d-8e9f-0a1b2c3d4e5f";

describe("reprocessAnalysisSchema", () => {
  it("aceita leadId uuid válido (REPRO-06)", () => {
    const result = reprocessAnalysisSchema.safeParse({ leadId: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it("rejeita leadId que não é uuid (REPRO-06)", () => {
    const result = reprocessAnalysisSchema.safeParse({ leadId: "nao-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejeita leadId ausente (REPRO-06)", () => {
    const result = reprocessAnalysisSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejeita campos extras (.strict) (REPRO-06)", () => {
    const result = reprocessAnalysisSchema.safeParse({
      leadId: VALID_UUID,
      status: "analisado",
    });
    expect(result.success).toBe(false);
  });
});
