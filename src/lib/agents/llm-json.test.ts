import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { LanguageModel } from "ai";
import { extractJson, generateValidatedJson, LlmJsonError } from "./llm-json";

const llm = {} as LanguageModel;
const schema = z.object({ bullets: z.array(z.string()) }).strict();

function fakeGenerate(...responses: { text: string; finishReason?: string }[]) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({ text: r.text, finishReason: r.finishReason ?? "stop" });
  }
  return fn;
}

describe("extractJson", () => {
  it("lê JSON puro", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("ignora bloco <think> de modelos de raciocínio", () => {
    expect(extractJson('<think>pensando {não é json}</think>\n{"a":1}')).toEqual({ a: 1 });
  });

  it("lê JSON dentro de cerca markdown", () => {
    expect(extractJson('Segue:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("lê JSON com texto antes e depois", () => {
    expect(extractJson('Claro! {"a":1} Espero ter ajudado.')).toEqual({ a: 1 });
  });

  it("lança LlmJsonError para resposta vazia", () => {
    expect(() => extractJson("   ")).toThrow(LlmJsonError);
  });

  it("lança LlmJsonError para JSON truncado", () => {
    expect(() => extractJson('{"bullets":[{"texto":"cortad')).toThrow(LlmJsonError);
  });
});

describe("generateValidatedJson", () => {
  it("retorna o objeto validado na primeira tentativa", async () => {
    const generate = fakeGenerate({ text: '{"bullets":["x"]}' });

    const result = await generateValidatedJson({ llm, prompt: "p", schema, maxOutputTokens: 100, generate });

    expect(result).toEqual({ bullets: ["x"] });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("refaz quando a resposta é cortada por limite de tokens e pede concisão", async () => {
    const generate = fakeGenerate(
      { text: '{"bullets":["cort', finishReason: "length" },
      { text: '{"bullets":["ok"]}' },
    );

    const result = await generateValidatedJson({ llm, prompt: "p", schema, maxOutputTokens: 100, generate });

    expect(result).toEqual({ bullets: ["ok"] });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].prompt).toContain("cortada");
  });

  it("refaz quando a resposta vem vazia (tokens gastos no raciocínio)", async () => {
    const generate = fakeGenerate({ text: "" }, { text: '{"bullets":[]}' });

    await expect(
      generateValidatedJson({ llm, prompt: "p", schema, maxOutputTokens: 100, generate }),
    ).resolves.toEqual({ bullets: [] });
  });

  it("refaz enviando os campos inválidos quando o schema falha", async () => {
    const generate = fakeGenerate({ text: '{"bullets":[1]}' }, { text: '{"bullets":["1"]}' });

    const result = await generateValidatedJson({ llm, prompt: "p", schema, maxOutputTokens: 100, generate });

    expect(result).toEqual({ bullets: ["1"] });
    expect(generate.mock.calls[1][0].prompt).toContain("bullets.0");
  });

  it("aplica normalize antes de validar", async () => {
    const generate = fakeGenerate({ text: '{"bullets":["a","b","c"]}' });

    const result = await generateValidatedJson({
      llm,
      prompt: "p",
      schema,
      maxOutputTokens: 100,
      generate,
      normalize: (raw) => ({ bullets: (raw as { bullets: string[] }).bullets.slice(0, 1) }),
    });

    expect(result).toEqual({ bullets: ["a"] });
  });

  it("lança LlmJsonError com o último motivo após esgotar as tentativas", async () => {
    const generate = fakeGenerate({ text: "nada" }, { text: "nada" }, { text: "nada" });

    await expect(
      generateValidatedJson({ llm, prompt: "p", schema, maxOutputTokens: 100, generate }),
    ).rejects.toThrow("Resposta do LLM não contém JSON válido (após 3 tentativas)");
    expect(generate).toHaveBeenCalledTimes(3);
  });
});
