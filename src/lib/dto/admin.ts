export interface AdminLeadRowDTO {
  leadId: string;
  name: string;
  company: string;
  email: string;
  leadStatus: string;
  hasDiagnostic: boolean;
  analysisStatus: "pendente" | "processando" | "analisado" | "falha" | null;
  analysisUpdatedAt: string | null;
}

export interface AdminKpisDTO {
  leadsTotal: number;
  diagnosticosConcluidos: number;
  relatoriosPendentes: number;
  relatoriosFalha: number;
}

export interface AdminDashboardResponseDTO {
  kpis: AdminKpisDTO;
  rows: AdminLeadRowDTO[];
}
