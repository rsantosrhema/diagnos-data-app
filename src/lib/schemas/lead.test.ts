import { describe, it, expect } from "vitest";
import { ESTADOS } from "@/lib/localidades/estados";
import { leadSchema } from "./lead";

const CIDADE_LONGA = "a".repeat(100);

function baseLead() {
  return {
    name: "Ana Souza",
    company: "Corp Dados",
    phone: "11999998888",
    email: "ana@corp.com.br",
    role: "C-level (CEO, CTO, CFO, CIO)",
    state: "SP",
    city: "São Paulo",
  };
}

function parseLead(input: Record<string, unknown>) {
  const result = leadSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`lead deveria ser válido: ${result.error.message}`);
  }
  return result.data;
}

function issueDoCampo(input: Record<string, unknown>, campo: string) {
  const result = leadSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error(`lead deveria ser inválido no campo ${campo}`);
  }
  const issue = result.error.issues.find((item) => item.path[0] === campo);
  if (!issue) {
    throw new Error(`esperava um erro no campo ${campo}`);
  }
  return issue;
}

function leadSem(campo: "state" | "city") {
  const lead: Record<string, unknown> = baseLead();
  delete lead[campo];
  return lead;
}

describe("leadSchema localização", () => {
  it("aceita lead com estado e cidade válidos", () => {
    const data = parseLead(baseLead());

    expect(data.state).toBe("SP");
    expect(data.city).toBe("São Paulo");
  });

  it("preserva acentos e nomes compostos da cidade", () => {
    const data = parseLead({ ...baseLead(), city: "São José do Rio Preto" });

    expect(data.city).toBe("São José do Rio Preto");
  });

  it("remove espaços ao redor da cidade", () => {
    const data = parseLead({ ...baseLead(), city: "  São José do Rio Preto  " });

    expect(data.city).toBe("São José do Rio Preto");
  });

  it("rejeita lead sem estado", () => {
    const issue = issueDoCampo(leadSem("state"), "state");

    expect(issue.message).toBe("Informe um estado válido");
  });

  it("rejeita estado fora das 27 UFs", () => {
    const issue = issueDoCampo({ ...baseLead(), state: "XX" }, "state");

    expect(issue.message).toBe("Informe um estado válido");
  });

  it("rejeita estado em minúsculas", () => {
    const issue = issueDoCampo({ ...baseLead(), state: "sp" }, "state");

    expect(issue.message).toBe("Informe um estado válido");
  });

  it("rejeita lead sem cidade", () => {
    const issue = issueDoCampo(leadSem("city"), "city");

    expect(issue.message).toBe("Informe a cidade");
  });

  it("rejeita cidade com menos de 2 caracteres após o trim", () => {
    const issue = issueDoCampo({ ...baseLead(), city: " A " }, "city");

    expect(issue.message).toBe("Informe a cidade");
  });

  it("rejeita cidade com mais de 80 caracteres", () => {
    const issue = issueDoCampo({ ...baseLead(), city: CIDADE_LONGA }, "city");

    expect(issue.message).toBe("Cidade muito longa");
    expect(issue.path).toEqual(["city"]);
  });

  it("rejeita cidade com sinal de menor", () => {
    const issue = issueDoCampo({ ...baseLead(), city: "<script>São Paulo" }, "city");

    expect(issue.message).toBe("Cidade inválida");
  });

  it("rejeita cidade com sinal de maior", () => {
    const issue = issueDoCampo({ ...baseLead(), city: "São Paulo > Rio" }, "city");

    expect(issue.message).toBe("Cidade inválida");
  });

  it("mantém o honeypot website opcional", () => {
    expect(parseLead(baseLead()).website).toBeUndefined();
    expect(parseLead({ ...baseLead(), website: "http://bot.example" }).website).toBe(
      "http://bot.example",
    );
  });

  it("rejeita chaves desconhecidas no topo", () => {
    const result = leadSchema.safeParse({ ...baseLead(), novochave: "x" });

    expect(result.success).toBe(false);
    if (result.success) return;
    const rejeitada = result.error.issues.some(
      (issue) => issue.code === "unrecognized_keys" && issue.keys.includes("novochave"),
    );
    expect(rejeitada).toBe(true);
  });
});

describe("leadSchema estado", () => {
  it("aceita as 27 UFs", () => {
    expect(ESTADOS).toHaveLength(27);

    for (const estado of ESTADOS) {
      const data = parseLead({ ...baseLead(), state: estado.sigla });

      expect(data.state).toBe(estado.sigla);
    }
  });

  it("rejeita string que não é UF", () => {
    const issue = issueDoCampo({ ...baseLead(), state: "Brasil" }, "state");

    expect(issue.message).toBe("Informe um estado válido");
  });
});
