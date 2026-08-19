import { checkRateLimit, resetAllRateLimits } from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => resetAllRateLimits());

  it("permite até o limite dentro da janela", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("ip:1", 5, 60_000).allowed).toBe(true);
    }
  });

  it("bloqueia ao exceder o limite e informa retryAfter", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("ip:2", 5, 60_000);
    const r = checkRateLimit("ip:2", 5, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("chaves diferentes têm contadores independentes", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("ip:a", 5, 60_000);
    expect(checkRateLimit("ip:b", 5, 60_000).allowed).toBe(true);
  });

  it("reseta após a janela expirar", async () => {
    for (let i = 0; i < 3; i++) checkRateLimit("ip:3", 3, 50);
    expect(checkRateLimit("ip:3", 3, 50).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(checkRateLimit("ip:3", 3, 50).allowed).toBe(true);
  });
});
