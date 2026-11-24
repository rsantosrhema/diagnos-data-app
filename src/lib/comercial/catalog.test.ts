import { describe, it, expect } from "vitest";
import {
  serviceCatalogSchema,
  objectionCatalogSchema,
  SERVICE_IDS,
  OBJECTION_GROUP_IDS,
  COMMERCIAL_CATALOG,
  getService,
  getObjectionGroup,
} from "./catalog";
import servicosJson from "../../../docs/comercial/servicos.json";
import objecoesJson from "../../../docs/comercial/objecoes.json";

const EXPECTED_SERVICE_IDS = [
  "diagnostico-360",
  "governanca",
  "qualidade-mestres",
  "arquitetura-integracao",
  "analytics-bi",
  "seguranca-lgpd",
  "ia-analytics-avancado",
];

const EXPECTED_GROUP_IDS = ["preco", "timing", "ja-temos", "confianca", "risco-dados", "decisao"];

function duplicateServiceCatalog() {
  return {
    ...servicosJson,
    servicos: [servicosJson.servicos[1], ...servicosJson.servicos],
  };
}

function duplicateObjectionCatalog() {
  return {
    ...objecoesJson,
    grupos: [objecoesJson.grupos[0], ...objecoesJson.grupos],
  };
}

function issueMessages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.message);
}

describe("catálogo comercial", () => {
  it("expõe os 7 serviços do seed na ordem definida", () => {
    expect(SERVICE_IDS).toEqual(EXPECTED_SERVICE_IDS);
  });

  it("expõe os 6 grupos de objeção do seed na ordem definida", () => {
    expect(OBJECTION_GROUP_IDS).toEqual(EXPECTED_GROUP_IDS);
  });

  it("mantém o catálogo em rascunho enquanto os arquivos seed são rascunho", () => {
    expect(COMMERCIAL_CATALOG.status).toBe("rascunho");
    expect(servicosJson.status).toBe("rascunho");
    expect(objecoesJson.status).toBe("rascunho");
  });

  it("rejeita id de serviço duplicado com a mensagem do id ofensor", () => {
    const result = serviceCatalogSchema.safeParse(duplicateServiceCatalog());

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("id duplicado: governanca");
  });

  it("rejeita dimensão fora do contrato com a mensagem do valor ofensor", () => {
    const catalog = {
      ...servicosJson,
      servicos: servicosJson.servicos.map((service) =>
        service.id === "governanca" ? { ...service, dimensoes: ["d99"] } : service,
      ),
    };

    const result = serviceCatalogSchema.safeParse(catalog);

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("dimensão desconhecida: d99");
  });

  it("rejeita grupo de objeção duplicado com a mensagem do id ofensor", () => {
    const result = objectionCatalogSchema.safeParse(duplicateObjectionCatalog());

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("id duplicado: preco");
  });

  it("rejeita chave desconhecida no catálogo e no item", () => {
    const withRootKey = serviceCatalogSchema.safeParse({ ...servicosJson, extra: true });
    const withItemKey = serviceCatalogSchema.safeParse({
      ...servicosJson,
      servicos: [{ ...servicosJson.servicos[0], preco: "R$ 10 mil" }, ...servicosJson.servicos.slice(1)],
    });

    expect(withRootKey.success).toBe(false);
    expect(withItemKey.success).toBe(false);
  });

  it("rejeita id fora do padrão minúsculo com hífen", () => {
    const catalog = {
      ...servicosJson,
      servicos: [{ ...servicosJson.servicos[0], id: "Governança" }, ...servicosJson.servicos.slice(1)],
    };

    expect(serviceCatalogSchema.safeParse(catalog).success).toBe(false);
    expect(
      objectionCatalogSchema.safeParse({
        ...objecoesJson,
        grupos: [{ ...objecoesJson.grupos[0], id: "Preço" }, ...objecoesJson.grupos.slice(1)],
      }).success,
    ).toBe(false);
  });

  it("rejeita serviço sem campo obrigatório e com dimensoes vazio (ARS-01)", () => {
    const { id, nome, resumo, dimensoes } = servicosJson.servicos[0];
    const semQuandoIndicar = { id, nome, resumo, dimensoes };
    const semCampo = serviceCatalogSchema.safeParse({
      ...servicosJson,
      servicos: [semQuandoIndicar, ...servicosJson.servicos.slice(1)],
    });
    const semDimensao = serviceCatalogSchema.safeParse({
      ...servicosJson,
      servicos: [
        { ...servicosJson.servicos[0], dimensoes: [] },
        ...servicosJson.servicos.slice(1),
      ],
    });

    expect(semCampo.success).toBe(false);
    expect(semDimensao.success).toBe(false);
  });

  it("rejeita grupo de objeção sem nome ou sem descrição (ARS-03)", () => {
    const { id, nome } = objecoesJson.grupos[0];
    const semDescricao = objectionCatalogSchema.safeParse({
      ...objecoesJson,
      grupos: [{ id, nome }, ...objecoesJson.grupos.slice(1)],
    });
    const nomeVazio = objectionCatalogSchema.safeParse({
      ...objecoesJson,
      grupos: [
        { ...objecoesJson.grupos[0], nome: "" },
        ...objecoesJson.grupos.slice(1),
      ],
    });

    expect(semDescricao.success).toBe(false);
    expect(nomeVazio.success).toBe(false);
  });

  it("consulta serviços e grupos por id, devolvendo undefined quando não existe", () => {
    expect(getService("governanca")?.nome).toBe("Governança de Dados");
    expect(getObjectionGroup("preco")?.nome).toBe("Preço e orçamento");
    expect(getService("x")).toBeUndefined();
    expect(getObjectionGroup("x")).toBeUndefined();
  });

  it("mantém resumo, quando_indicar e descricao como textos não vazios de até 160 caracteres", () => {
    for (const service of servicosJson.servicos) {
      expect(service.resumo.length).toBeGreaterThan(0);
      expect(service.resumo.length).toBeLessThanOrEqual(160);
      expect(service.quando_indicar.length).toBeGreaterThan(0);
      expect(service.quando_indicar.length).toBeLessThanOrEqual(160);
    }
    for (const group of objecoesJson.grupos) {
      expect(group.descricao.length).toBeGreaterThan(0);
      expect(group.descricao.length).toBeLessThanOrEqual(160);
    }
  });
});
