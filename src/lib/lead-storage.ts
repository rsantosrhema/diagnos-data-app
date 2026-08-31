export const LEAD_STORAGE_KEY = "diagnos_lead";

export interface StoredLead {
  leadId: string;
  name: string;
  email: string;
  company: string;
  role: string;
}

export function readStoredLead(): StoredLead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LEAD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredLead>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.name !== "string" || typeof parsed.email !== "string") {
      return null;
    }
    return {
      leadId: typeof parsed.leadId === "string" ? parsed.leadId : "",
      name: parsed.name,
      email: parsed.email,
      company: typeof parsed.company === "string" ? parsed.company : "",
      role: typeof parsed.role === "string" ? parsed.role : "",
    };
  } catch {
    return null;
  }
}

export function clearStoredLead(): void {
  try {
    sessionStorage.removeItem(LEAD_STORAGE_KEY);
  } catch {
    // ignore
  }
}
