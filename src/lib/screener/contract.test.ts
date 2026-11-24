import { describe, it, expect } from "vitest";
import {
  SCREENER_CONTRACT,
  screenerContractSchema,
  DIMENSION_IDS,
  CARGOS,
  PERFIL_IDS,
  COMMERCIAL_ID,
  getDimensionById,
  getProfileQuestionById,
} from "./contract";
import snapshotJson from "../../../docs/snapshot-maturidade-dados.json";

describe("SCREENER_CONTRACT", () => {
  it("valida o JSON do snapshot sem erros", () => {
    const result = screenerContractSchema.safeParse(snapshotJson);
    expect(result.success).toBe(true);
  });

  it("tem lista de cargos não vazia", () => {
    expect(CARGOS.length).toBeGreaterThanOrEqual(1);
  });

  it("não tem perguntas de contexto (cargo movido para o lead)", () => {
    expect(SCREENER_CONTRACT.perguntas_contexto).toHaveLength(0);
  });

  it("tem 3 perguntas de perfil da empresa", () => {
    expect(SCREENER_CONTRACT.perfil_empresa).toHaveLength(3);
  });

  it("tem 10 dimensões", () => {
    expect(SCREENER_CONTRACT.dimensoes).toHaveLength(10);
  });

  it("cada dimensão tem exatamente 5 opções com níveis 1–5", () => {
    for (const dim of SCREENER_CONTRACT.dimensoes) {
      expect(dim.opcoes).toHaveLength(5);
      const niveis = dim.opcoes.map((o) => o.nivel).sort();
      expect(niveis).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("pesos das dimensões somam 100", () => {
    const total = SCREENER_CONTRACT.dimensoes.reduce(
      (sum, d) => sum + d.peso,
      0,
    );
    expect(total).toBe(100);
  });

  it("faixas têm min, max, rotulo e descricao", () => {
    for (const faixa of SCREENER_CONTRACT.scoring.faixas) {
      expect(faixa.min).toBeGreaterThanOrEqual(0);
      expect(faixa.max).toBeGreaterThan(faixa.min);
      expect(faixa.rotulo.length).toBeGreaterThan(0);
      expect(faixa.descricao.length).toBeGreaterThan(0);
    }
  });

  it("faixas cobrem a escala 1.0–5.0", () => {
    const faixas = SCREENER_CONTRACT.scoring.faixas;
    expect(faixas[0].min).toBeLessThanOrEqual(1.0);
    expect(faixas[faixas.length - 1].max).toBeGreaterThanOrEqual(5.0);
  });

  it("pergunta_comercial não é pontuada", () => {
    expect(SCREENER_CONTRACT.pergunta_comercial.pontuada).toBe(false);
  });

  it("regras_de_relatorio tem pelo menos 1 regra", () => {
    expect(SCREENER_CONTRACT.scoring.regras_de_relatorio.length).toBeGreaterThanOrEqual(1);
  });

  it("cada dimensão tem 5 opções com nivel 1-5", () => {
    for (const dim of SCREENER_CONTRACT.dimensoes) {
      for (let i = 0; i < 5; i++) {
        expect(dim.opcoes[i].nivel).toBe(i + 1);
        expect(dim.opcoes[i].texto.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("contrato v1.2 — referência única DAMA-DMBOK2", () => {
  it("meta.versao é 1.2", () => {
    expect(SCREENER_CONTRACT.meta.versao).toBe("1.2");
  });

  it("meta.escala descreve a escala DAMA-DMBOK2", () => {
    expect(SCREENER_CONTRACT.meta.escala).toBe(
      "DAMA-DMBOK2 (cap. 15): 1 Inicial · 2 Repetível · 3 Definido · 4 Gerenciado · 5 Otimizado",
    );
  });

  it("meta.escala_niveis traz exatamente os 5 níveis DMBOK2", () => {
    expect(SCREENER_CONTRACT.meta.escala_niveis).toEqual([
      { nivel: 1, rotulo: "Inicial" },
      { nivel: 2, rotulo: "Repetível" },
      { nivel: 3, rotulo: "Definido" },
      { nivel: 4, rotulo: "Gerenciado" },
      { nivel: 5, rotulo: "Otimizado" },
    ]);
  });

  it("meta.nome_indice e meta.referencia identificam o índice", () => {
    expect(SCREENER_CONTRACT.meta.nome_indice).toBe(
      "Índice de Maturidade Rhema",
    );
    expect(SCREENER_CONTRACT.meta.referencia).toBe(
      "Índice proprietário da Rhema Data, estruturado sobre as áreas de conhecimento do DAMA-DMBOK2 e sua abordagem de avaliação de maturidade (cap. 15), com pesos ajustados ao segmento e ao porte da empresa. Instrumento de triagem por autoavaliação; não é certificação.",
    );
  });

  it("metaSchema exige escala_niveis com 5 itens", () => {
    const invalid = {
      ...snapshotJson,
      meta: {
        ...snapshotJson.meta,
        escala_niveis: snapshotJson.meta.escala_niveis.slice(0, 4),
      },
    };
    expect(screenerContractSchema.safeParse(invalid).success).toBe(false);
  });

  it("metaSchema exige nivel inteiro entre 1 e 5", () => {
    const invalid = {
      ...snapshotJson,
      meta: {
        ...snapshotJson.meta,
        escala_niveis: snapshotJson.meta.escala_niveis.map((n) =>
          n.nivel === 5 ? { ...n, nivel: 6 } : n,
        ),
      },
    };
    expect(screenerContractSchema.safeParse(invalid).success).toBe(false);
  });

  it("metaSchema exige rotulo não vazio em escala_niveis", () => {
    const invalid = {
      ...snapshotJson,
      meta: {
        ...snapshotJson.meta,
        escala_niveis: snapshotJson.meta.escala_niveis.map((n) =>
          n.nivel === 1 ? { ...n, rotulo: "" } : n,
        ),
      },
    };
    expect(screenerContractSchema.safeParse(invalid).success).toBe(false);
  });

  it("metaSchema exige nome_indice e referencia", () => {
    const { nome_indice: _nome, ...semNome } = snapshotJson.meta;
    const { referencia: _ref, ...semReferencia } = snapshotJson.meta;
    expect(
      screenerContractSchema.safeParse({ ...snapshotJson, meta: semNome })
        .success,
    ).toBe(false);
    expect(
      screenerContractSchema.safeParse({ ...snapshotJson, meta: semReferencia })
        .success,
    ).toBe(false);
  });

  it("area_dmbok das 10 dimensões aponta só para áreas do DAMA-DMBOK2", () => {
    const areas = Object.fromEntries(
      SCREENER_CONTRACT.dimensoes.map((d) => [d.id, d.area_dmbok]),
    );
    expect(areas).toEqual({
      d01: "Data Governance",
      d02: "Data Governance (Data Strategy)",
      d03: "Data Architecture / Data Integration",
      d04: "Data Quality",
      d05: "Metadata Management",
      d06: "Reference & Master Data",
      d07: "Data Security",
      d08: "Data Warehousing & BI",
      d09: "Big Data & Data Science",
      d10: "Data Management Organization & Role Expectations",
    });
  });

  it("mantém os 50 textos de opção, com o nível 3 de d01/d03/d05/d07 reescrito", () => {
    const textos = Object.fromEntries(
      SCREENER_CONTRACT.dimensoes.map((d) => [
        d.id,
        d.opcoes.map((o) => o.texto),
      ]),
    );
    expect(textos).toEqual({
      d01: [
        "Não há dono definido — quem está disponível resolve",
        "TI assume tudo, mesmo quando o problema é da área de negócio",
        "Papéis de dono formalizados, mas cobrindo só parte dos dados críticos",
        "Donos designados por domínio, com papéis documentados",
        "Comitê de dados ativo com priorização e resolução de conflitos",
      ],
      d02: [
        "Sem orçamento — dados são sobra de projetos de TI",
        "Aprovação reativa, caso a caso",
        "Orçamento anual existe, mas sem business case formal",
        "Estratégia escrita com patrocinador e orçamento plurianual",
        "ROI medido após entrega e revisado periodicamente",
      ],
      d03: [
        "Exportamos planilhas e cruzamos manualmente",
        "Integrações sob demanda, cada uma com tecnologia diferente",
        "Repositório central com padrões de integração definidos, aplicados a parte das fontes",
        "Plataforma unificada com pipelines versionados",
        "Dados como produtos, com contratos de interface",
      ],
      d04: [
        "Erros só aparecem quando alguém reclama",
        "Correção manual, sem registro",
        "Conferência periódica, sem automação",
        "Testes automatizados alertam antes do dado chegar ao usuário",
        "Indicadores de qualidade acompanhados como KPI",
      ],
      d05: [
        "Ninguém sabe a origem com segurança",
        "Dá para descobrir, mas leva dias",
        "Documentação padronizada para os dados críticos, atualizada manualmente",
        "Catálogo com glossário de negócio mantido ativamente",
        "Linhagem automática da origem ao consumo",
      ],
      d06: [
        "Cada sistema tem seu próprio cadastro",
        "Tabelas de-para mantidas manualmente",
        "Existe sistema fonte da verdade, sem sincronização formal",
        "MDM implantado em ao menos um domínio crítico",
        "MDM com governança e regras de sobrevivência",
      ],
      d07: [
        "Sem mapeamento — assumimos que está tudo nos sistemas",
        "Conhecemos os sistemas principais, mas não planilhas paralelas",
        "Inventário de dados pessoais formalizado, com revisão em ciclo definido",
        "Dados classificados com controle de acesso e auditoria",
        "Classificação automatizada com mascaramento e revisão periódica",
      ],
      d08: [
        "Toda análise entra em fila com TI",
        "Cada área monta sua própria planilha",
        "Dashboards prontos existem, mas recortes novos dependem de TI",
        "Self-service com dados confiáveis",
        "Self-service com governança, catálogo e métricas certificadas",
      ],
      d09: [
        "Sem uso de IA conectada aos dados",
        "Experimentos isolados, sem processo",
        "Modelos em produção, sem monitoramento formal",
        "Modelos versionados e monitorados com retreino definido",
        "Governança formal com aprovação, documentação e auditabilidade",
      ],
      d10: [
        "Responsabilidade acumulada de quem cuida de sistemas",
        "Uma ou duas pessoas fazem tudo",
        "Time dedicado com papéis pouco definidos",
        "Papéis claros (engenharia, análise, governança)",
        "Time estruturado com plano de capacitação e sucessão",
      ],
    });
  });

  it("não cita CMMI, DCAM nem DMM em nenhum texto do contrato", () => {
    const serialized = JSON.stringify(SCREENER_CONTRACT);
    expect(serialized).not.toContain("CMMI");
    expect(serialized).not.toContain("DCAM");
    expect(serialized).not.toContain("DMM");
  });
});

describe("DIMENSION_IDS", () => {
  it("contém 10 IDs únicos", () => {
    expect(DIMENSION_IDS).toHaveLength(10);
    expect(new Set(DIMENSION_IDS).size).toBe(10);
  });
});

describe("CARGOS", () => {
  it("inclui o cargo de C-level", () => {
    expect(CARGOS.some((c) => c.toLowerCase().includes("c-level"))).toBe(true);
  });
});

describe("PERFIL_IDS", () => {
  it("contém perfil_01, perfil_02 e perfil_03", () => {
    expect(PERFIL_IDS).toContain("perfil_01");
    expect(PERFIL_IDS).toContain("perfil_02");
    expect(PERFIL_IDS).toContain("perfil_03");
  });
});

describe("COMMERCIAL_ID", () => {
  it("é cta_01", () => {
    expect(COMMERCIAL_ID).toBe("cta_01");
  });
});

describe("getDimensionById", () => {
  it("retorna a dimensão quando o ID existe", () => {
    const dim = getDimensionById("d01");
    expect(dim).toBeDefined();
    expect(dim!.nome.length).toBeGreaterThan(0);
  });

  it("retorna undefined para ID inexistente", () => {
    expect(getDimensionById("d99")).toBeUndefined();
  });
});

describe("getProfileQuestionById", () => {
  it("retorna a pergunta quando o ID existe", () => {
    const q = getProfileQuestionById("perfil_01");
    expect(q).toBeDefined();
    expect(q!.pergunta.length).toBeGreaterThan(0);
  });

  it("retorna undefined para ID inexistente", () => {
    expect(getProfileQuestionById("perfil_99")).toBeUndefined();
  });
});
