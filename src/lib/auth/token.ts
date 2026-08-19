import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem chars ambíguos (0/O, 1/I/L)
const TOKEN_LENGTH = 6;

export function generateToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  let out = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token.trim().toUpperCase()).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidTokenFormat(token: string): boolean {
  return /^[A-Z2-9]{6}$/.test(token.trim().toUpperCase());
}
