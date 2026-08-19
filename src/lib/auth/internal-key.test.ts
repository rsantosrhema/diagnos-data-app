import { describe, it, expect, beforeEach } from "vitest";
import { verifyInternalApiKey } from "./internal-key";

const REAL_KEY = "a".repeat(64) + "-secret-internal-key-for-tests-only";

describe("internal API key", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = REAL_KEY;
  });

  function makeReq(header?: string | null): Request {
    const h = new Headers();
    if (header !== null && header !== undefined) h.set("x-internal-api-key", header);
    return new Request("http://localhost/test", { headers: h });
  }

  it("rejeita quando header ausente", () => {
    expect(verifyInternalApiKey(makeReq(null))).toBe(false);
  });

  it("rejeita chave diferente", () => {
    expect(verifyInternalApiKey(makeReq("outra-chave-aleatoria"))).toBe(false);
  });

  it("aceita a chave real", () => {
    expect(verifyInternalApiKey(makeReq(REAL_KEY))).toBe(true);
  });

  it("falha fechado se INTERNAL_API_KEY não estiver configurada", () => {
    delete process.env.INTERNAL_API_KEY;
    expect(verifyInternalApiKey(makeReq(REAL_KEY))).toBe(false);
  });

  it("falha fechado se INTERNAL_API_KEY for curta demais", () => {
    process.env.INTERNAL_API_KEY = "short";
    expect(verifyInternalApiKey(makeReq(REAL_KEY))).toBe(false);
  });
});
