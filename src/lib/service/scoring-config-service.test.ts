import { describe, it, expect, vi, beforeEach } from "vitest";
import { createScoringConfigService, ScoringConfigServiceError } from "./scoring-config-service";
import type { ScoringConfigRepository } from "@/lib/repository/scoring-config-repo";
import type { ScoringCalibration } from "@/lib/screener/scoring-calibration";

function mockConfigRepo(overrides: Partial<ScoringConfigRepository> = {}): ScoringConfigRepository {
  return {
    createVersion: vi.fn().mockResolvedValue({ id: "uuid-1", version: "1.0.0" }),
    listVersions: vi.fn().mockResolvedValue([]),
    getActiveVersion: vi.fn().mockResolvedValue(null),
    activateVersion: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as ScoringConfigRepository;
}

describe("createScoringConfigService", () => {
  beforeEach(() => {
    // Clear cache between tests
    const service = createScoringConfigService({ configRepo: mockConfigRepo() });
    service.clearCache();
  });

  describe("loadActiveCalibration", () => {
    it("retorna JSON seed quando Supabase retorna null", async () => {
      const repo = mockConfigRepo({ getActiveVersion: vi.fn().mockResolvedValue(null) });
      const service = createScoringConfigService({ configRepo: repo });

      const result = await service.loadActiveCalibration();
      expect(result.version).toBe("1.0.0");
    });

    it("retorna config do Supabase quando disponível", async () => {
      const dbConfig = { version: "2.0.0", dimensions: {} } as unknown as ScoringCalibration;
      const repo = mockConfigRepo({
        getActiveVersion: vi.fn().mockResolvedValue({ id: "uuid-1", config: dbConfig }),
      });
      const service = createScoringConfigService({ configRepo: repo });

      const result = await service.loadActiveCalibration();
      expect(result.version).toBe("2.0.0");
    });

    it("fallback para seed quando Supabase lança erro", async () => {
      const repo = mockConfigRepo({
        getActiveVersion: vi.fn().mockRejectedValue(new Error("connection refused")),
      });
      const service = createScoringConfigService({ configRepo: repo });

      const result = await service.loadActiveCalibration();
      expect(result.version).toBe("1.0.0");
    });
  });

  describe("createCalibrationVersion", () => {
    it("cria versão com config válido", async () => {
      const repo = mockConfigRepo();
      const service = createScoringConfigService({ configRepo: repo });

      const validConfig = {
        version: "2.0.0",
        effective_from: "2025-09-01",
        dimensions: {
          d01: { base_weight: 12, min: 7, max: 17, description: "Test" },
          d02: { base_weight: 12, min: 7, max: 17, description: "Test" },
          d03: { base_weight: 12, min: 7, max: 17, description: "Test" },
          d04: { base_weight: 12, min: 7, max: 17, description: "Test" },
          d05: { base_weight: 10, min: 6, max: 14, description: "Test" },
          d06: { base_weight: 8, min: 5, max: 11, description: "Test" },
          d07: { base_weight: 10, min: 6, max: 14, description: "Test" },
          d08: { base_weight: 10, min: 6, max: 14, description: "Test" },
          d09: { base_weight: 6, min: 4, max: 8, description: "Test" },
          d10: { base_weight: 8, min: 5, max: 11, description: "Test" },
        },
        profile_factors: {
          segmento: { type: "categorical", source_field: "perfil_01", multipliers: { Outro: { d01: 1.0, d02: 1.0, d03: 1.0, d04: 1.0, d05: 1.0, d06: 1.0, d07: 1.0, d08: 1.0, d09: 1.0, d10: 1.0 } } },
        },
        normalization: { method: "proportional", target_total: 100, rounding: "largest_remainder" },
        constraints: { max_weight_change_percent: 40, min_score: 1.0, max_score: 5.0 },
        recalibrated_bands: { Outro: [{ min: 1.0, max: 5.0, rotulo: "Test", descricao: "Test" }] },
      };

      const result = await service.createCalibrationVersion("2.0.0", validConfig);
      expect(result.id).toBe("uuid-1");
    });

    it("rejeita config inválido com 400", async () => {
      const repo = mockConfigRepo();
      const service = createScoringConfigService({ configRepo: repo });

      await expect(
        service.createCalibrationVersion("2.0.0", { invalid: true }),
      ).rejects.toThrow(ScoringConfigServiceError);
    });
  });

  describe("activateCalibrationVersion", () => {
    it("ativa versão e limpa cache", async () => {
      const repo = mockConfigRepo();
      const service = createScoringConfigService({ configRepo: repo });

      await service.activateCalibrationVersion("uuid-1");
      expect(repo.activateVersion).toHaveBeenCalledWith("uuid-1");
    });
  });
});
