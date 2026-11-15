import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LEAD_STORAGE_KEY, clearStoredLead, readStoredLead } from "./lead-storage";

const BASE_LEAD = {
  leadId: "lead-123",
  name: "Ana Souza",
  email: "ana@empresa.com",
  company: "Empresa SA",
  role: "Diretora de Dados",
};

function storeLead(value: unknown): void {
  sessionStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(value));
}

function createThrowingStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  return {
    getItem() {
      throw new Error("storage indisponível");
    },
    setItem() {
      throw new Error("storage indisponível");
    },
    removeItem() {
      throw new Error("storage indisponível");
    },
  };
}

describe("lead-storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", globalThis);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lê cidade e estado gravados no lead", () => {
    storeLead({ ...BASE_LEAD, city: "São Paulo", state: "SP" });

    expect(readStoredLead()).toEqual({
      ...BASE_LEAD,
      city: "São Paulo",
      state: "SP",
    });
  });

  it("lê rascunho antigo sem cidade e estado devolvendo strings vazias", () => {
    storeLead(BASE_LEAD);

    expect(readStoredLead()).toEqual({ ...BASE_LEAD, city: "", state: "" });
  });

  it("ignora cidade e estado que não são strings", () => {
    storeLead({ ...BASE_LEAD, city: 42, state: null });

    expect(readStoredLead()).toEqual({ ...BASE_LEAD, city: "", state: "" });
  });

  it("retorna null para JSON inválido", () => {
    sessionStorage.setItem(LEAD_STORAGE_KEY, "{nao-e-json");

    expect(readStoredLead()).toBeNull();
  });

  it("retorna null quando o conteúdo não é um objeto", () => {
    storeLead(null);

    expect(readStoredLead()).toBeNull();
  });

  it("retorna null quando falta o nome", () => {
    storeLead({ ...BASE_LEAD, name: undefined });

    expect(readStoredLead()).toBeNull();
  });

  it("retorna null quando falta o e-mail", () => {
    storeLead({ ...BASE_LEAD, email: undefined });

    expect(readStoredLead()).toBeNull();
  });

  it("clearStoredLead remove o lead da sessão", () => {
    storeLead({ ...BASE_LEAD, city: "São Paulo", state: "SP" });

    clearStoredLead();

    expect(sessionStorage.getItem(LEAD_STORAGE_KEY)).toBeNull();
  });

  it("retorna null quando o sessionStorage lança ao ler e clearStoredLead não lança", () => {
    vi.stubGlobal("sessionStorage", createThrowingStorage());

    expect(readStoredLead()).toBeNull();
    expect(() => clearStoredLead()).not.toThrow();
  });

  it("retorna null quando não há window (SSR)", () => {
    storeLead({ ...BASE_LEAD, city: "São Paulo", state: "SP" });
    vi.stubGlobal("window", undefined);

    expect(readStoredLead()).toBeNull();
  });
});
