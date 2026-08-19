import { createHash, timingSafeEqual } from "node:crypto";

function getInternalApiKey(): string | null {
  const key = process.env.INTERNAL_API_KEY;
  if (!key || key.length < 32) return null;
  return key;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function verifyInternalApiKey(req: Request): boolean {
  const expected = getInternalApiKey();
  if (!expected) return false;

  const header = req.headers.get("x-internal-api-key");
  if (!header) return false;

  const provided = sha256(header);
  const expectedHash = sha256(expected);
  if (provided.length !== expectedHash.length) return false;
  return timingSafeEqual(provided, expectedHash);
}
