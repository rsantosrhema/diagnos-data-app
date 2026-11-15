// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  submitLead: vi.fn(),
  getMunicipios: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

const MUNICIPIOS_POR_UF: Record<string, string[]> = {
  SP: ["São Paulo", "Campinas", "Santos", "São José do Rio Preto"],
  RJ: ["Rio de Janeiro", "Niterói", "Campos dos Goytacazes"],
};

let HomePage: React.ComponentType;

beforeEach(async () => {
  vi.resetAllMocks();
  sessionStorage.clear();

  const api = await import("@/lib/api/client");
  vi.mocked(api.getMunicipios).mockImplementation(async (uf: string) => MUNICIPIOS_POR_UF[uf] ?? []);
  vi.mocked(api.submitLead).mockResolvedValue({ ok: true, leadId: "lead-123" });

  const mod = await import("./page");
  HomePage = mod.default;
});

function renderPage() {
  render(React.createElement(HomePage));
}

function getSelect(label: string): HTMLSelectElement {
  return screen.getByLabelText(label) as HTMLSelectElement;
}

function chooseState(uf: string) {
  fireEvent.change(getSelect("Estado"), { target: { value: uf } });
}

function chooseCity(nome: string) {
  fireEvent.change(getSelect("Cidade"), { target: { value: nome } });
}

function fillBaseForm() {
  fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "João Silva" } });
  fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "Corp LTDA" } });
  const cargo = getSelect("Cargo");
  fireEvent.change(cargo, { target: { value: cargo.options[1].value } });
  fireEvent.change(screen.getByLabelText("Email corporativo"), { target: { value: "joao@corp.com" } });
  fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "(11) 99999-9999" } });
}

function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: /iniciar diagnóstico/i }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("HomePage - localização do lead", () => {
  it("renderiza o select de Estado com as 27 UFs e a Cidade desabilitada", () => {
    renderPage();

    const estado = getSelect("Estado");
    const opcoes = Array.from(estado.querySelectorAll("option"));
    expect(opcoes).toHaveLength(28);
    expect(opcoes[0].disabled).toBe(true);
    expect(opcoes[0].textContent).toBe("Selecione o estado");
    expect(opcoes.some((o) => o.textContent === "SP — São Paulo")).toBe(true);
    expect(opcoes.some((o) => o.textContent === "RJ — Rio de Janeiro")).toBe(true);

    const cidade = getSelect("Cidade");
    expect(cidade.tagName).toBe("SELECT");
    expect(cidade.disabled).toBe(true);
    expect(within(cidade).getByText("Selecione sua cidade")).toBeTruthy();
  });

  it("carrega os municípios ao escolher SP, habilita a Cidade e preserva os acentos", async () => {
    const api = await import("@/lib/api/client");
    renderPage();

    chooseState("SP");

    await waitFor(() => expect(api.getMunicipios).toHaveBeenCalledWith("SP"));
    await waitFor(() => expect(getSelect("Cidade").disabled).toBe(false));
    expect(await screen.findByRole("option", { name: "São José do Rio Preto" })).toBeTruthy();
    expect(getSelect("Cidade").value).toBe("");
  });

  it("ao trocar a UF limpa a cidade escolhida e busca os municípios da nova UF", async () => {
    const api = await import("@/lib/api/client");
    renderPage();

    chooseState("SP");
    await screen.findByRole("option", { name: "Campinas" });
    chooseCity("Campinas");
    expect(getSelect("Cidade").value).toBe("Campinas");

    chooseState("RJ");

    expect(getSelect("Cidade").value).toBe("");
    await waitFor(() => expect(api.getMunicipios).toHaveBeenCalledWith("RJ"));
    expect(await screen.findByRole("option", { name: "Niterói" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Campinas" })).toBeNull();
  });

  it("vira campo de texto livre obrigatório quando a API de localidades falha", async () => {
    const api = await import("@/lib/api/client");
    vi.mocked(api.getMunicipios).mockRejectedValue(new api.ApiError("Falha na localidade", 502));
    renderPage();

    fillBaseForm();
    chooseState("SP");

    await waitFor(() => expect(screen.getByLabelText("Cidade").tagName).toBe("INPUT"));
    const cidade = screen.getByLabelText("Cidade");
    expect((cidade as HTMLInputElement).type).toBe("text");

    fireEvent.change(cidade, { target: { value: "Santos" } });
    submitForm();

    await waitFor(() =>
      expect(api.submitLead).toHaveBeenCalledWith(
        expect.objectContaining({ city: "Santos", state: "SP" }),
      ),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/diagnostico"));
  });

  it("vira campo de texto livre obrigatório quando a lista de municípios vem vazia", async () => {
    const api = await import("@/lib/api/client");
    vi.mocked(api.getMunicipios).mockResolvedValue([]);
    renderPage();

    chooseState("SP");

    await waitFor(() => expect(screen.getByLabelText("Cidade").tagName).toBe("INPUT"));
    const cidade = screen.getByLabelText("Cidade");
    expect((cidade as HTMLInputElement).type).toBe("text");

    fireEvent.change(cidade, { target: { value: "Santos" } });
    fillBaseForm();
    submitForm();

    await waitFor(() =>
      expect(api.submitLead).toHaveBeenCalledWith(
        expect.objectContaining({ city: "Santos", state: "SP" }),
      ),
    );
  });

  it("valida Estado e Cidade obrigatórios e não chama o servidor", async () => {
    const api = await import("@/lib/api/client");
    renderPage();

    fillBaseForm();
    submitForm();

    expect(await screen.findByText("Informe o estado")).toBeTruthy();
    expect(screen.getByText("Informe a cidade")).toBeTruthy();
    expect(api.submitLead).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("envia cidade e estado no cadastro e navega para o diagnóstico", async () => {
    const api = await import("@/lib/api/client");
    renderPage();

    fillBaseForm();
    chooseState("SP");
    await screen.findByRole("option", { name: "São José do Rio Preto" });
    chooseCity("São José do Rio Preto");
    submitForm();

    await waitFor(() =>
      expect(api.submitLead).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "João Silva",
          city: "São José do Rio Preto",
          state: "SP",
        }),
      ),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/diagnostico"));
  });

  it("grava cidade e estado no lead da sessão após o envio", async () => {
    renderPage();

    fillBaseForm();
    chooseState("SP");
    await screen.findByRole("option", { name: "Campinas" });
    chooseCity("Campinas");
    submitForm();

    await waitFor(() => {
      const stored = JSON.parse(sessionStorage.getItem("diagnos_lead") ?? "{}") as {
        leadId?: string;
        city?: string;
        state?: string;
      };
      expect(stored.leadId).toBe("lead-123");
      expect(stored.city).toBe("Campinas");
      expect(stored.state).toBe("SP");
    });
  });

  it("ignora a resposta atrasada de uma UF anterior", async () => {
    const api = await import("@/lib/api/client");
    const spRequest = deferred<string[]>();
    const rjRequest = deferred<string[]>();
    vi.mocked(api.getMunicipios).mockReset();
    vi.mocked(api.getMunicipios)
      .mockImplementationOnce(() => spRequest.promise)
      .mockImplementationOnce(() => rjRequest.promise);
    renderPage();

    chooseState("SP");
    await waitFor(() => expect(api.getMunicipios).toHaveBeenCalledWith("SP"));

    chooseState("RJ");
    await waitFor(() => expect(api.getMunicipios).toHaveBeenCalledWith("RJ"));

    rjRequest.resolve(["Rio de Janeiro", "Niterói"]);
    expect(await screen.findByRole("option", { name: "Niterói" })).toBeTruthy();

    spRequest.resolve(["São Paulo", "Campinas"]);
    await waitFor(() => expect(api.getMunicipios).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("option", { name: "Campinas" })).toBeNull();
    expect(screen.queryByRole("option", { name: "São Paulo" })).toBeNull();
  });
});
