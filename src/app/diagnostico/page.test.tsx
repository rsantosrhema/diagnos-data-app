// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/api/client", () => ({
  submitScreener: vi.fn().mockResolvedValue({ ok: true }),
  getScreenerProfile: vi.fn().mockResolvedValue({
    id: "lead-1",
    name: "João Silva",
    email: "joao@corp.com",
    company: "Corp LTDA",
    role: "CTO",
    status: "token_gerado",
    isMaster: false,
  }),
  logoutSession: vi.fn().mockResolvedValue({ ok: true }),
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
    perguntas_contexto: [],
    perfil_empresa: [
      { id: "perfil_01", pergunta: "Qual o segmento?", opcoes: ["Indústria", "Varejo"] },
      { id: "perfil_02", pergunta: "Quantas pessoas?", opcoes: ["Até 50", "51 a 200"] },
      { id: "perfil_03", pergunta: "Qual o faturamento?", opcoes: ["Até R$ 5 mi", "R$ 5 a 50 mi"] },
    ],
    dimensoes: Array.from({ length: 10 }, (_, i) => ({
      id: `d${String(i + 1).padStart(2, "0")}`,
      nome: `Dimensão ${i + 1}`,
      peso: 10,
      pergunta: `Pergunta dimensão ${i + 1}?`,
      opcoes: [
        { nivel: 1, texto: "Não fazemos: sem prática" },
        { nivel: 2, texto: "Pontual: isolado" },
        { nivel: 3, texto: "Definido: documentado" },
        { nivel: 4, texto: "Gerenciado: medido" },
        { nivel: 5, texto: "Otimizado: automatizado" },
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
  PERFIL_IDS: ["perfil_01", "perfil_02", "perfil_03"],
  COMMERCIAL_ID: "cta_01",
}));

let DiagnosticoPage: React.ComponentType;

beforeEach(async () => {
  localStorage.clear();
  vi.clearAllMocks();
  const mod = await import("./page");
  DiagnosticoPage = mod.default;
});

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

function selectDropdownOption(labelPattern: string, optionIndex: number) {
  const select = screen.getByLabelText(new RegExp(labelPattern, "i")) as HTMLSelectElement;
  const options = select.querySelectorAll("option");
  const enabledOptions = Array.from(options).filter((o) => !o.disabled);
  if (enabledOptions[optionIndex]) {
    fireEvent.change(select, { target: { value: enabledOptions[optionIndex].value } });
  }
}

async function advanceThroughAllSteps() {
  // info step - greeting + 3 profile dropdowns
  await waitFor(() => {
    expect(screen.getByText(/olá, joão silva/i)).toBeTruthy();
  });
  selectDropdownOption("segmento", 0);
  selectDropdownOption("pessoas", 0);
  selectDropdownOption("faturamento", 0);
  clickNext();

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
  it("renderiza o primeiro step com saudação e dropdowns de perfil", async () => {
    render(React.createElement(DiagnosticoPage));
    await waitFor(() => {
      expect(screen.getByText(/olá, joão silva/i)).toBeTruthy();
      expect(screen.getByText(/corp ltda/i)).toBeTruthy();
    });
    expect(screen.getByLabelText(/segmento/i)).toBeTruthy();
    expect(screen.getByLabelText(/pessoas/i)).toBeTruthy();
    expect(screen.getByLabelText(/faturamento/i)).toBeTruthy();
  });

  it("avança para dimensões após preencher perfil", async () => {
    render(React.createElement(DiagnosticoPage));
    await waitFor(() => {
      expect(screen.getByText(/olá, joão silva/i)).toBeTruthy();
    });
    selectDropdownOption("segmento", 0);
    selectDropdownOption("pessoas", 0);
    selectDropdownOption("faturamento", 0);
    clickNext();
    await waitFor(() => {
      expect(screen.getAllByText(/dimensão 1/i).length).toBeGreaterThan(0);
    });
  });

  it("mostra erro ao tentar avançar sem selecionar perfil", async () => {
    render(React.createElement(DiagnosticoPage));
    await waitFor(() => {
      expect(screen.getByText(/olá, joão silva/i)).toBeTruthy();
    });
    clickNext();
    await waitFor(() => {
      expect(screen.getAllByText(/selecione uma opção/i).length).toBeGreaterThan(0);
    });
  });

  it("salva dados no localStorage", async () => {
    render(React.createElement(DiagnosticoPage));
    await waitFor(() => {
      expect(screen.getByText(/olá, joão silva/i)).toBeTruthy();
    });
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
      expect(submitScreener).toHaveBeenCalledWith(
        expect.objectContaining({ leadId: "lead-1", name: "João Silva" }),
      );
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

  it("mostra progresso atualizado (13 steps no total)", async () => {
    render(React.createElement(DiagnosticoPage));
    expect(screen.getByText(/1 de 13/i)).toBeTruthy();
  });

  it("botão anterior desabilitado no primeiro step", () => {
    render(React.createElement(DiagnosticoPage));
    const prevBtn = screen.getByText(/anterior/i);
    expect(prevBtn.hasAttribute("disabled")).toBe(true);
  });
});
