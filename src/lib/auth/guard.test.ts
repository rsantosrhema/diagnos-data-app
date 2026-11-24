import { describe, it, expect, afterEach, vi } from "vitest";
import { isManagerEmail } from "./guard";

describe("isManagerEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("nega todos quando MANAGER_EMAILS está vazio", () => {
    vi.stubEnv("MANAGER_EMAILS", "");
    expect(isManagerEmail("gerente@corp.com")).toBe(false);
  });

  it("nega todos quando MANAGER_EMAILS só tem separadores/espaços", () => {
    vi.stubEnv("MANAGER_EMAILS", " , ,");
    expect(isManagerEmail("gerente@corp.com")).toBe(false);
  });

  it("nega todos quando MANAGER_EMAILS está ausente", () => {
    vi.stubEnv("MANAGER_EMAILS", undefined);
    expect(isManagerEmail("gerente@corp.com")).toBe(false);
  });

  it("permite email da lista ignorando caixa e espaços", () => {
    vi.stubEnv("MANAGER_EMAILS", "Gerente@Corp.com , outro@corp.com");
    expect(isManagerEmail("gerente@corp.com")).toBe(true);
    expect(isManagerEmail("OUTRO@corp.com")).toBe(true);
  });

  it("nega email fora da lista", () => {
    vi.stubEnv("MANAGER_EMAILS", "gerente@corp.com");
    expect(isManagerEmail("intruso@corp.com")).toBe(false);
  });

  it("nega email nulo ou vazio", () => {
    vi.stubEnv("MANAGER_EMAILS", "gerente@corp.com");
    expect(isManagerEmail(null)).toBe(false);
    expect(isManagerEmail(undefined)).toBe(false);
    expect(isManagerEmail("")).toBe(false);
  });
});
