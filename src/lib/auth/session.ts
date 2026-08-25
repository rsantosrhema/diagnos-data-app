import { getServiceClient } from "@/lib/supabase/server";
import { createSessionRepository } from "@/lib/repository/session-repo";
import { createLeadRepository, type LeadProfileRow } from "@/lib/repository/lead-repo";
import { hashSessionToken } from "@/lib/auth/token";

const SESSION_COOKIE = "diagnos_session";

export interface SessionData {
  lead: LeadProfileRow;
  isMaster: boolean;
}

export async function readLeadFromSession(
  req: Request,
): Promise<SessionData | null> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const raw = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));

  if (!raw) return null;

  const sessionToken = raw.slice(SESSION_COOKIE.length + 1);
  if (!sessionToken) return null;

  const supabase = getServiceClient();
  const sessionRepo = createSessionRepository(supabase);
  const session = await sessionRepo.findActiveByHash(
    hashSessionToken(sessionToken),
  );
  if (!session) return null;

  const leadRepo = createLeadRepository(supabase);
  const lead = await leadRepo.findProfileById(session.lead_id);
  if (!lead) return null;

  return { lead, isMaster: session.is_master };
}

export async function logoutSession(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return false;

  const raw = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));

  if (!raw) return false;

  const sessionToken = raw.slice(SESSION_COOKIE.length + 1);
  if (!sessionToken) return false;

  const supabase = getServiceClient();
  const sessionRepo = createSessionRepository(supabase);
  await sessionRepo.deleteByHash(hashSessionToken(sessionToken));
  return true;
}

export { SESSION_COOKIE };
