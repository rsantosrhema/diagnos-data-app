const API_BASE = "/api";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body } = opts;

  const headers: Record<string, string> = {};

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (data as { error?: string })?.error ?? `Erro ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ─── Public API (via proxy) ───

export interface LeadInput {
  name: string;
  company: string;
  phone: string;
  email: string;
  role: string;
  website?: string;
}

export async function submitLead(
  input: LeadInput,
): Promise<{ ok: boolean; leadId?: string }> {
  return apiFetch("/public-proxy/leads", { method: "POST", body: input });
}

export interface ScreenerInput {
  leadId?: string;
  name: string;
  role?: string;
  email: string;
  consent: boolean;
  consentText: string;
  context: Record<string, string>;
  profile?: Record<string, string>;
  answers: { dimensionId: string; nivel: number }[];
  commercialAnswer?: string;
  company?: { name?: string; size?: string };
  website?: string;
}

export async function submitScreener(input: ScreenerInput): Promise<{ ok: true }> {
  return apiFetch("/public-proxy/screener", { method: "POST", body: input });
}

// ─── Admin API (via proxy, requires auth) ───

export type AnalysisStatus = "pendente" | "processando" | "analisado" | "falha" | null;

export interface AdminLeadRow {
  leadId: string;
  name: string;
  company: string;
  email: string;
  leadStatus: string;
  hasDiagnostic: boolean;
  analysisStatus: AnalysisStatus;
  analysisUpdatedAt: string | null;
  analysisQueuedAt: string | null;
  processingStartedAt: string | null;
  attempts: number;
  errorMessage: string | null;
  ageSeconds: number | null;
}

export interface AdminKpis {
  leadsTotal: number;
  diagnosticosConcluidos: number;
  relatoriosPendentes: number;
  relatoriosFalha: number;
  relatoriosEmProcessamento: number;
}

export interface AdminQueueStats {
  queueLength: number;
  oldestAgeSec: number | null;
  pendente: number;
  processando: number;
  analisado: number;
  falha: number;
}

export interface AdminLogEntry {
  leadId: string;
  leadName: string | null;
  step: string;
  message: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface AdminDashboardResponse {
  kpis: AdminKpis;
  rows: AdminLeadRow[];
  queue: AdminQueueStats;
  logs: AdminLogEntry[];
}

export async function getAdminDashboard(): Promise<AdminDashboardResponse> {
  return apiFetch("/admin-proxy/dashboard");
}

export async function generateReport(
  leadId: string,
): Promise<{ ok: true; queued: boolean }> {
  return apiFetch("/admin-proxy/analysis/reprocess", {
    method: "POST",
    body: { leadId },
  });
}

// ─── Admin session (cookie-based, httpOnly) ───

export interface AdminSessionInfo {
  authenticated: boolean;
  email: string | null;
}

export async function loginAdminSession(
  email: string,
  password: string,
): Promise<AdminSessionInfo> {
  return apiFetch("/admin-proxy/session", { method: "POST", body: { email, password } });
}

export async function getAdminSessionInfo(): Promise<AdminSessionInfo> {
  return apiFetch("/admin-proxy/session");
}

export async function logoutAdminSession(): Promise<{ ok: boolean }> {
  return apiFetch("/admin-proxy/session", { method: "DELETE" });
}
