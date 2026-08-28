import type { ScoringConfigRepository } from "@/lib/repository/scoring-config-repo";
import type { ScoringCalibration } from "@/lib/screener/scoring-calibration";
import { scoringCalibrationSchema, SCORING_CALIBRATION } from "@/lib/screener/scoring-calibration";

export class ScoringConfigServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ScoringConfigServiceError";
  }
}

let cachedCalibration: ScoringCalibration | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

export function createScoringConfigService(deps: {
  configRepo: ScoringConfigRepository;
}) {
  const { configRepo } = deps;

  return {
    async loadActiveCalibration(): Promise<ScoringCalibration> {
      const now = Date.now();
      if (cachedCalibration && now - cacheTimestamp < CACHE_TTL_MS) {
        return cachedCalibration;
      }

      try {
        const active = await configRepo.getActiveVersion();
        if (active) {
          cachedCalibration = active.config;
          cacheTimestamp = now;
          return active.config;
        }
      } catch {
        // Supabase unavailable — fall through to seed
      }

      cachedCalibration = SCORING_CALIBRATION;
      cacheTimestamp = now;
      return SCORING_CALIBRATION;
    },

    async createCalibrationVersion(
      version: string,
      config: unknown,
    ): Promise<{ id: string; version: string }> {
      const result = scoringCalibrationSchema.safeParse(config);
      if (!result.success) {
        const issues = result.error.issues.map(
          (i) => `${i.path.join(".")}: ${i.message}`,
        );
        throw new ScoringConfigServiceError(
          `Configuração inválida: ${issues.join("; ")}`,
          400,
        );
      }

      const total = Object.values(result.data.dimensions).reduce(
        (sum, d) => sum + d.base_weight,
        0,
      );
      if (total !== result.data.normalization.target_total) {
        throw new ScoringConfigServiceError(
          `Soma dos pesos base (${total}) ≠ target_total (${result.data.normalization.target_total})`,
          400,
        );
      }

      const created = await configRepo.createVersion({
        version,
        config: result.data,
        createdBy: "admin",
      });

      return { id: created.id, version: created.version };
    },

    async activateCalibrationVersion(id: string): Promise<void> {
      await configRepo.activateVersion(id);
      cachedCalibration = null;
      cacheTimestamp = 0;
    },

    async listVersions() {
      return configRepo.listVersions();
    },

    clearCache(): void {
      cachedCalibration = null;
      cacheTimestamp = 0;
    },
  };
}
