export interface AdminLeadRowDTO {
  leadId: string;
  name: string;
  company: string;
  email: string;
  leadStatus: string;
  tokenId: string | null;
  tokenStatus: string | null;
  tokenExpiresAt: string | null;
  tokenSentAt: string | null;
}

export interface AdminKpisDTO {
  pendentesEnvio: number;
  expirados: number;
  cadastrados: number;
}

export interface AdminTokensResponseDTO {
  kpis: AdminKpisDTO;
  rows: AdminLeadRowDTO[];
}

export interface TokenActionDTO {
  ok?: boolean;
  token?: string;
  sentAt?: string;
  mailto?: string;
}
