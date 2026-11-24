import { describe, it, expect } from "vitest";
import { commercialArsenalSchema } from "./commercial-types";
import { makeArsenal } from "./commercial-fixture";

type ParseResult = ReturnType<typeof commercialArsenalSchema.safeParse>;

function issueMessages(result: ParseResult): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

function withQuestions(change: (questions: ReturnType<typeof makeArsenal>["perguntas"]) => void) {
  const arsenal = makeArsenal();
  change(arsenal.perguntas);
  return arsenal;
}

describe("commercialArsenalSchema", () => {
  it("aceita a fixture base válida", () => {
    const result = commercialArsenalSchema.safeParse(makeArsenal());

    expect(result.success).toBe(true);
  });

  describe("pontos_chave", () => {
    it("rejeita 2 pontos-chave", () => {
      const arsenal = makeArsenal();
      const result = commercialArsenalSchema.safeParse({
        ...arsenal,
        pontos_chave: arsenal.pontos_chave.slice(0, 2),
      });

      expect(result.success).toBe(false);
    });

    it("aceita 3 e 5 pontos-chave", () => {
      const arsenal = makeArsenal();
      const three = commercialArsenalSchema.safeParse({
        ...arsenal,
        pontos_chave: arsenal.pontos_chave.slice(0, 3),
      });
      const five = commercialArsenalSchema.safeParse({
        ...arsenal,
        pontos_chave: [...arsenal.pontos_chave, arsenal.pontos_chave[0]],
      });

      expect(three.success).toBe(true);
      expect(five.success).toBe(true);
    });

    it("rejeita 6 pontos-chave", () => {
      const arsenal = makeArsenal();
      const result = commercialArsenalSchema.safeParse({
        ...arsenal,
        pontos_chave: [...arsenal.pontos_chave, arsenal.pontos_chave[0], arsenal.pontos_chave[1]],
      });

      expect(result.success).toBe(false);
    });

    it("rejeita dimensao_ids vazio ou fora do contrato", () => {
      const empty = makeArsenal();
      const unknown = makeArsenal();
      empty.pontos_chave[0].dimensao_ids = [];
      unknown.pontos_chave[0].dimensao_ids = ["d99"];

      expect(commercialArsenalSchema.safeParse(empty).success).toBe(false);
      expect(commercialArsenalSchema.safeParse(unknown).success).toBe(false);
    });
  });

  describe("objecoes", () => {
    it("rejeita 2 objeções", () => {
      const arsenal = makeArsenal();
      const result = commercialArsenalSchema.safeParse({
        ...arsenal,
        objecoes: arsenal.objecoes.slice(0, 2),
      });

      expect(result.success).toBe(false);
    });

    it("aceita 3 e 6 objeções de grupos distintos", () => {
      const arsenal = makeArsenal();
      const extra = [
        { ...arsenal.objecoes[0], grupo: "confianca" },
        { ...arsenal.objecoes[0], grupo: "decisao" },
      ];
      const three = commercialArsenalSchema.safeParse({
        ...arsenal,
        objecoes: arsenal.objecoes.slice(0, 3),
      });
      const six = commercialArsenalSchema.safeParse({
        ...arsenal,
        objecoes: [...arsenal.objecoes, ...extra],
      });

      expect(three.success).toBe(true);
      expect(six.success).toBe(true);
    });

    it("rejeita 7 objeções", () => {
      const arsenal = makeArsenal();
      const result = commercialArsenalSchema.safeParse({
        ...arsenal,
        objecoes: [
          ...arsenal.objecoes,
          { ...arsenal.objecoes[0], grupo: "confianca" },
          { ...arsenal.objecoes[0], grupo: "decisao" },
          { ...arsenal.objecoes[0], grupo: "preco" },
        ],
      });

      expect(result.success).toBe(false);
    });

    it("rejeita grupo fora do catálogo", () => {
      const arsenal = makeArsenal();
      const result = commercialArsenalSchema.safeParse({
        ...arsenal,
        objecoes: [
          { ...arsenal.objecoes[0], grupo: "inexistente" },
          ...arsenal.objecoes.slice(1),
        ],
      });

      expect(result.success).toBe(false);
    });

    it("rejeita grupo repetido com a mensagem e o grupo ofensor", () => {
      const arsenal = makeArsenal();
      const result = commercialArsenalSchema.safeParse({
        ...arsenal,
        objecoes: [
          arsenal.objecoes[0],
          { ...arsenal.objecoes[1], grupo: "preco" },
          ...arsenal.objecoes.slice(2),
        ],
      });

      expect(issueMessages(result)).toContain("grupo repetido: preco");
    });
  });

  describe("servico_recomendado", () => {
    it("rejeita serviço fora do catálogo", () => {
      const arsenal = makeArsenal();
      arsenal.servico_recomendado.servico_id = "inexistente";

      expect(commercialArsenalSchema.safeParse(arsenal).success).toBe(false);
    });

    it("rejeita complementar igual ao serviço principal", () => {
      const arsenal = makeArsenal();
      arsenal.servico_recomendado.complementares = ["governanca"];

      const result = commercialArsenalSchema.safeParse(arsenal);

      expect(issueMessages(result)).toContain(
        "complementares não pode repetir o serviço principal ou outro complementar",
      );
    });

    it("rejeita 3 complementares", () => {
      const arsenal = makeArsenal();
      arsenal.servico_recomendado.complementares = [
        "qualidade-mestres",
        "arquitetura-integracao",
        "analytics-bi",
      ];

      expect(commercialArsenalSchema.safeParse(arsenal).success).toBe(false);
    });

    it("rejeita complementares repetidos entre si", () => {
      const arsenal = makeArsenal();
      arsenal.servico_recomendado.complementares = [
        "qualidade-mestres",
        "qualidade-mestres",
      ];

      const result = commercialArsenalSchema.safeParse(arsenal);

      expect(issueMessages(result)).toContain(
        "complementares não pode repetir o serviço principal ou outro complementar",
      );
    });
  });

  describe("perguntas", () => {
    it("rejeita 9 e 11 perguntas", () => {
      const nine = withQuestions((questions) => {
        questions.splice(9, 1);
      });
      const eleven = withQuestions((questions) => {
        questions.push(questions[0]);
      });

      expect(commercialArsenalSchema.safeParse(nine).success).toBe(false);
      expect(commercialArsenalSchema.safeParse(eleven).success).toBe(false);
    });

    it("rejeita formato e etapa SPIN fora do contrato", () => {
      const arsenal = makeArsenal();
      const formatoInvalido = commercialArsenalSchema.safeParse({
        ...arsenal,
        perguntas: arsenal.perguntas.map((question, index) =>
          index === 0 ? { ...question, formato: "mista" } : question,
        ),
      });
      const spinInvalido = commercialArsenalSchema.safeParse({
        ...arsenal,
        perguntas: arsenal.perguntas.map((question, index) =>
          index === 0 ? { ...question, spin: "abertura" } : question,
        ),
      });

      expect(formatoInvalido.success).toBe(false);
      expect(spinInvalido.success).toBe(false);
    });

    it("rejeita 3 abertas com a contagem recebida", () => {
      const arsenal = withQuestions((questions) => {
        for (const index of [1, 4, 6]) questions[index].formato = "fechada";
      });

      const result = commercialArsenalSchema.safeParse(arsenal);

      expect(issueMessages(result)).toContain("mínimo de 4 perguntas abertas (recebido 3)");
    });

    it("rejeita 2 fechadas com a contagem recebida", () => {
      const arsenal = withQuestions((questions) => {
        for (const index of [8, 9]) questions[index].formato = "aberta";
      });

      const result = commercialArsenalSchema.safeParse(arsenal);

      expect(issueMessages(result)).toContain("mínimo de 3 perguntas fechadas (recebido 2)");
    });

    it("rejeita 2 perguntas de situacao com a contagem recebida", () => {
      const arsenal = withQuestions((questions) => {
        questions[1].spin = "situacao";
      });

      const result = commercialArsenalSchema.safeParse(arsenal);

      expect(issueMessages(result)).toContain(
        "no máximo 1 pergunta de 'situacao' (recebido 2)",
      );
    });

    it("rejeita 1 pergunta de problema com a contagem recebida", () => {
      const arsenal = withQuestions((questions) => {
        questions[1].spin = "implicacao";
        questions[3].spin = "implicacao";
      });

      const result = commercialArsenalSchema.safeParse(arsenal);

      expect(issueMessages(result)).toContain("mínimo de 2 perguntas de 'problema' (recebido 1)");
    });

    it("rejeita 1 pergunta de implicacao com a contagem recebida", () => {
      const arsenal = withQuestions((questions) => {
        questions[4].spin = "problema";
        questions[6].spin = "problema";
      });

      const result = commercialArsenalSchema.safeParse(arsenal);

      expect(issueMessages(result)).toContain(
        "mínimo de 2 perguntas de 'implicacao' (recebido 1)",
      );
    });

    it("rejeita 1 pergunta de necessidade com a contagem recebida", () => {
      const arsenal = withQuestions((questions) => {
        questions[7].spin = "implicacao";
        questions[8].spin = "implicacao";
      });

      const result = commercialArsenalSchema.safeParse(arsenal);

      expect(issueMessages(result)).toContain(
        "mínimo de 2 perguntas de 'necessidade' (recebido 1)",
      );
    });
  });

  it("rejeita chave desconhecida no arsenal e nos itens", () => {
    const withRootKey = { ...makeArsenal(), extra: true };
    const arsenal = makeArsenal();
    const withItemKey = {
      ...arsenal,
      pontos_chave: [{ ...arsenal.pontos_chave[0], extra: true }, ...arsenal.pontos_chave.slice(1)],
    };

    expect(commercialArsenalSchema.safeParse(withRootKey).success).toBe(false);
    expect(commercialArsenalSchema.safeParse(withItemKey).success).toBe(false);
  });

  it("trunca texto acima do limite na última palavra e termina com reticências", () => {
    const arsenal = makeArsenal();
    const longText = Array.from({ length: 400 }, () => "dado").join(" ");
    arsenal.pontos_chave[0].texto = longText;

    const result = commercialArsenalSchema.safeParse(arsenal);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const texto = result.data.pontos_chave[0].texto;
    expect(texto.length).toBeLessThanOrEqual(300);
    expect(texto.endsWith("…")).toBe(true);
    expect(texto).not.toMatch(/\s…$/);
  });

  it("mantém título com exatamente 70 caracteres inalterado", () => {
    const arsenal = makeArsenal();
    const title = "a".repeat(70);
    arsenal.pontos_chave[0].titulo = title;

    const result = commercialArsenalSchema.safeParse(arsenal);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.pontos_chave[0].titulo).toBe(title);
  });

  it("trunca cada campo de texto no seu próprio limite (ARS-11)", () => {
    const longText = Array.from({ length: 400 }, () => "dado").join(" ");
    const fields: Array<{
      name: string;
      max: number;
      mutate: (arsenal: ReturnType<typeof makeArsenal>) => void;
      read: (arsenal: ReturnType<typeof makeArsenal>) => string;
    }> = [
      {
        name: "titulo do ponto",
        max: 70,
        mutate: (arsenal) => {
          arsenal.pontos_chave[0].titulo = longText;
        },
        read: (arsenal) => arsenal.pontos_chave[0].titulo,
      },
      {
        name: "texto do ponto",
        max: 300,
        mutate: (arsenal) => {
          arsenal.pontos_chave[0].texto = longText;
        },
        read: (arsenal) => arsenal.pontos_chave[0].texto,
      },
      {
        name: "objecao_provavel",
        max: 200,
        mutate: (arsenal) => {
          arsenal.objecoes[0].objecao_provavel = longText;
        },
        read: (arsenal) => arsenal.objecoes[0].objecao_provavel,
      },
      {
        name: "contorno",
        max: 400,
        mutate: (arsenal) => {
          arsenal.objecoes[0].contorno = longText;
        },
        read: (arsenal) => arsenal.objecoes[0].contorno,
      },
      {
        name: "apoio",
        max: 250,
        mutate: (arsenal) => {
          arsenal.objecoes[0].apoio = longText;
        },
        read: (arsenal) => arsenal.objecoes[0].apoio,
      },
      {
        name: "justificativa",
        max: 500,
        mutate: (arsenal) => {
          arsenal.servico_recomendado.justificativa = longText;
        },
        read: (arsenal) => arsenal.servico_recomendado.justificativa,
      },
      {
        name: "texto da pergunta",
        max: 240,
        mutate: (arsenal) => {
          arsenal.perguntas[0].texto = longText;
        },
        read: (arsenal) => arsenal.perguntas[0].texto,
      },
      {
        name: "objetivo",
        max: 160,
        mutate: (arsenal) => {
          arsenal.perguntas[0].objetivo = longText;
        },
        read: (arsenal) => arsenal.perguntas[0].objetivo,
      },
    ];

    for (const field of fields) {
      const arsenal = makeArsenal();
      field.mutate(arsenal);
      const result = commercialArsenalSchema.safeParse(arsenal);

      expect(result.success, field.name).toBe(true);
      if (!result.success) continue;
      const value = field.read(result.data);
      expect(value.length, field.name).toBeLessThanOrEqual(field.max);
      expect(value.endsWith("…"), field.name).toBe(true);
      expect(value, field.name).not.toMatch(/\s…$/);
    }
  });
});
