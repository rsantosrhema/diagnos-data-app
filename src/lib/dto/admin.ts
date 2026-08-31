export interface AdminLeadRowDTO {
  leadId: string;
  name: string;
  company: string;
  email: string;
  leadStatus: string;
  hasDiagnostic: boolean;
  analysisStatus: "pendente" | "processando" | "analisado" | "falha" | null;
  analysisUpdatedAt: string | null;
  analysisQueuedAt: string | null;
  processingStartedAt: string | null;
  attempts: number;
  errorMessage: string | null;
  ageSeconds: number | null;
}

export interface AdminKpisDTO {
  leadsTotal: number;
  diagnosticosConcluidos: number;
  relatoriosPendentes: number;
  relatoriosFalha: number;
  relatoriosEmProcessamento: number;
}

export interface AdminQueueStatsDTO {
  queueLength: number;
  oldestAgeSec: number | null;
  pendente: number;
  processando: number;
  analisado: number;
  falha: number;
}

export interface AdminLogEntryDTO {
  leadId: string;
  leadName: string | null;
  step: string;
  message: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface AdminDashboardResponseDTO {
  kpis: AdminKpisDTO;
  rows: AdminLeadRowDTO[];
  queue: AdminQueueStatsDTO;
  logs: AdminLogEntryDTO[];
}
