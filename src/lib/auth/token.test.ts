import { generateToken, hashToken, isValidTokenFormat, createSessionToken, hashSessionToken } from "./token";

describe("token crypto", () => {
  it("gera token de 6 caracteres alfanuméricos", () => {
    const t = generateToken();
    expect(t).toHaveLength(6);
    expect(/^[A-Z2-9]{6}$/.test(t)).toBe(true);
  });

  it("não usa caracteres ambíguos (0,O,1,I,L)", () => {
    for (let i = 0; i < 200; i++) {
      const t = generateToken();
      expect(t).not.toMatch(/[01OIL]/);
    }
  });

  it("hash é SHA-256 hex de 64 chars e determinístico", () => {
    const h1 = hashToken("ABC234");
    const h2 = hashToken("ABC234");
    expect(h1).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(h1)).toBe(true);
    expect(h1).toBe(h2);
  });

  it("hash normaliza case e espaços", () => {
    expect(hashToken(" abc234 ")).toBe(hashToken("ABC234"));
  });

  it("tokens diferentes têm hashes diferentes", () => {
    expect(hashToken("ABC234")).not.toBe(hashToken("XYZ789"));
  });

  it("valida formato de token", () => {
    expect(isValidTokenFormat("ABC234")).toBe(true);
    expect(isValidTokenFormat("abc234")).toBe(true); // normaliza
    expect(isValidTokenFormat("ABC23")).toBe(false); // 5 chars
    expect(isValidTokenFormat("ABC2345")).toBe(false); // 7 chars
    expect(isValidTokenFormat("ABC23!")).toBe(false); // char inválido
  });

  it("cria token de sessão opaco e hash", () => {
    const s = createSessionToken();
    expect(s).toHaveLength(64);
    const h = hashSessionToken(s);
    expect(h).toHaveLength(64);
    expect(h).not.toBe(s);
  });
});
