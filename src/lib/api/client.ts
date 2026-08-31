const API_BASE = "/api";

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
}

async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token } = opts;

  const headers: Record<string, string> = {};

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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

export async function submitLead(input: LeadInput): Promise<{ ok: boolean }> {
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

export async function logoutSession(): Promise<{ ok: boolean }> {
  return apiFetch("/public-proxy/sessions/logout", { method: "POST" });
}

export interface ScreenerProfile {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  status: string;
  isMaster: boolean;
}

export async function getScreenerProfile(): Promise<ScreenerProfile> {
  return apiFetch("/public-proxy/screener/profile", { method: "GET" });
}

export async function validateToken(
  token: string,
): Promise<{ redirect: string }> {
  return apiFetch("/public-proxy/tokens/validate", {
    method: "POST",
    body: { token },
  });
}

// ─── Admin API (via proxy, requires auth) ───

export interface AdminLeadRow {
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

export interface AdminKpis {
  pendentesEnvio: number;
  expirados: number;
  cadastrados: number;
}

export interface AdminTokensResponse {
  kpis: AdminKpis;
  rows: AdminLeadRow[];
}

export async function getAdminTokens(
  authToken: string,
): Promise<AdminTokensResponse> {
  return apiFetch("/admin-proxy/tokens", { token: authToken });
}

export async function generateToken(
  leadId: string,
  authToken: string,
): Promise<{ token: string }> {
  return apiFetch("/admin-proxy/tokens/generate", {
    method: "POST",
    body: { leadId },
    token: authToken,
  });
}

export async function sendToken(
  tokenId: string,
  token: string,
  authToken: string,
): Promise<{ sentAt: string }> {
  return apiFetch(`/admin-proxy/tokens/${tokenId}/send`, {
    method: "POST",
    body: { token },
    token: authToken,
  });
}

export async function cancelToken(
  tokenId: string,
  authToken: string,
): Promise<{ ok: boolean }> {
  return apiFetch(`/admin-proxy/tokens/${tokenId}/cancel`, {
    method: "POST",
    token: authToken,
  });
}

export async function regenerateToken(
  tokenId: string,
  authToken: string,
): Promise<{ token: string }> {
  return apiFetch(`/admin-proxy/tokens/${tokenId}/regenerate`, {
    method: "POST",
    token: authToken,
  });
}

export async function reprocessAnalysis(
  leadId: string,
  authToken: string,
): Promise<{ ok: true }> {
  return apiFetch("/admin-proxy/analysis/reprocess", {
    method: "POST",
    body: { leadId },
    token: authToken,
  });
}
