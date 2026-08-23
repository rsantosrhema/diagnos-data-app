// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/api/client", () => ({
  submitScreener: vi.fn().mockResolvedValue({ ok: true }),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("../components/RhemaLogo", () => ({
  RhemaLogo: () => React.createElement("div", { "data-testid": "rhema-logo" }),
}));

vi.mock("../components/WaveDivider", () => ({
  WaveDivider: () => React.createElement("div", { "data-testid": "wave-divider" }),
}));

vi.mock("@/lib/screener/contract", () => ({
  SCREENER_CONTRACT: {
    meta: { aviso_metodologico: "Aviso metodológico de teste." },
    perguntas_contexto: [
      { id: "ctx_01", pergunta: "Qual o seu papel?", opcoes: ["C-level", "Analista"] },
      { id: "ctx_02", pergunta: "Quantas pessoas?", opcoes: ["Até 50", "51 a 200"] },
    ],
    dimensoes: Array.from({ length: 10 }, (_, i) => ({
      id: `d${String(i + 1).padStart(2, "0")}`,
      nome: `Dimensão ${i + 1}`,
      peso: 10,
      pergunta: `Pergunta dimensão ${i + 1}?`,
      opcoes: [
        { nivel: 1, texto: "Nível 1" },
        { nivel: 2, texto: "Nível 2" },
        { nivel: 3, texto: "Nível 3" },
        { nivel: 4, texto: "Nível 4" },
        { nivel: 5, texto: "Nível 5" },
      ],
    })),
    pergunta_comercial: {
      id: "cta_01",
      pergunta: "Quanto custou?",
      opcoes: ["Até R$ 50 mil", "Mais de R$ 50 mil"],
    },
    scoring: {
      faixas: [
        { min: 1.0, max: 1.8, rotulo: "Inicial", descricao: "Desc inicial" },
        { min: 1.8, max: 2.6, rotulo: "Emergente", descricao: "Desc emergente" },
        { min: 2.6, max: 3.4, rotulo: "Estruturado", descricao: "Desc estruturado" },
        { min: 3.4, max: 4.2, rotulo: "Gerenciado", descricao: "Desc gerenciado" },
        { min: 4.2, max: 5.0, rotulo: "Otimizado", descricao: "Desc otimizado" },
      ],
    },
  },
  DIMENSION_IDS: Array.from({ length: 10 }, (_, i) => `d${String(i + 1).padStart(2, "0")}`),
  CONTEXT_IDS: ["ctx_01", "ctx_02"],
  COMMERCIAL_ID: "cta_01",
}));

let DiagnosticoPage: React.ComponentType;

beforeEach(async () => {
  localStorage.clear();
  vi.clearAllMocks();
  const mod = await import("./page");
  DiagnosticoPage = mod.default;
});

function fillInfo() {
  fireEvent.change(screen.getByLabelText(/nome completo/i), {
    target: { value: "João Silva" },
  });
  fireEvent.change(screen.getByLabelText(/cargo/i), {
    target: { value: "CTO" },
  });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "joao@corp.com" },
  });
}

function clickNext() {
  fireEvent.click(screen.getByText(/próxima/i));
}

function selectSecondOption() {
  const buttons = screen.getAllByRole("button");
  const optionButtons = buttons.filter(
    (b) =>
      !b.textContent?.includes("Anterior") &&
      !b.textContent?.includes("Próxima") &&
      !b.textContent?.includes("Enviar"),
  );
  if (optionButtons.length >= 2) fireEvent.click(optionButtons[1]);
  else if (optionButtons.length >= 1) fireEvent.click(optionButtons[0]);
}

async function advanceThroughAllSteps() {
  fillInfo();
  clickNext();

  // 2 context questions
  for (let i = 0; i < 2; i++) {
    await waitFor(() => selectSecondOption());
    clickNext();
  }

  // 10 dimension questions
  for (let i = 0; i < 10; i++) {
    await waitFor(() => selectSecondOption());
    clickNext();
  }

  // commercial question
  await waitFor(() => selectSecondOption());
  clickNext();

  // consent step - click checkbox
  await waitFor(() => {
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
  });
}

describe("DiagnosticoPage", () => {
  it("renderiza o primeiro step com campos de info", () => {
    render(React.createElement(DiagnosticoPage));
    expect(screen.getByLabelText(/nome completo/i)).toBeTruthy();
    expect(screen.getByLabelText(/cargo/i)).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
  });

  it("mostra erro ao tentar avançar sem preencher", () => {
    render(React.createElement(DiagnosticoPage));
    clickNext();
    expect(screen.getByText(/informe seu nome/i)).toBeTruthy();
  });

  it("avança para contexto após preencher info", async () => {
    render(React.createElement(DiagnosticoPage));
    fillInfo();
    clickNext();
    await waitFor(() => {
      expect(screen.getByText(/contexto/i)).toBeTruthy();
    });
  });

  it("salva dados no localStorage", async () => {
    render(React.createElement(DiagnosticoPage));
    fillInfo();
    await waitFor(() => {
      const draft = JSON.parse(
        localStorage.getItem("diagnos_screener_draft") || "{}",
      );
      expect(draft.name).toBe("João Silva");
    });
  });

  it("navega por todas as steps e chega no consentimento", async () => {
    render(React.createElement(DiagnosticoPage));
    await advanceThroughAllSteps();

    await waitFor(() => {
      const consentElements = screen.getAllByText(/consentimento/i);
      expect(consentElements.length).toBeGreaterThan(0);
    });
  });

  it("envia o formulário com sucesso", async () => {
    const { submitScreener } = await import("@/lib/api/client");
    render(React.createElement(DiagnosticoPage));
    await advanceThroughAllSteps();

    await waitFor(() => {
      const submitBtn = screen.getByText(/enviar diagnóstico/i);
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/diagnóstico enviado/i)).toBeTruthy();
      expect(submitScreener).toHaveBeenCalled();
    });
  });

  it("limpa localStorage após envio bem-sucedido", async () => {
    localStorage.setItem(
      "diagnos_screener_draft",
      JSON.stringify({ name: "test" }),
    );
    render(React.createElement(DiagnosticoPage));
    await advanceThroughAllSteps();

    await waitFor(() => {
      const submitBtn = screen.getByText(/enviar diagnóstico/i);
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(localStorage.getItem("diagnos_screener_draft")).toBeNull();
    });
  });

  it("mostra progresso atualizado", () => {
    render(React.createElement(DiagnosticoPage));
    expect(screen.getByText(/1 de 15/i)).toBeTruthy();
  });

  it("botão anterior desabilitado no primeiro step", () => {
    render(React.createElement(DiagnosticoPage));
    const prevBtn = screen.getByText(/anterior/i);
    expect(prevBtn.hasAttribute("disabled")).toBe(true);
  });
});
