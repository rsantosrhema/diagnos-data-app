"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell, Toolbar, SiteFooter, Icon } from "./components/PageShell";
import { submitLead, type LeadInput } from "@/lib/api/client";
import { CARGOS } from "@/lib/screener/contract";
import { LEAD_STORAGE_KEY, type StoredLead } from "@/lib/lead-storage";

const INITIAL_FORM: LeadInput = {
  name: "",
  company: "",
  phone: "",
  email: "",
  role: "",
  website: "",
};

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState<LeadInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadInput, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [serverError, setServerError] = useState("");

  function validate(): boolean {
    const e: Partial<Record<keyof LeadInput, string>> = {};
    if (form.name.trim().length < 2) e.name = "Informe seu nome completo";
    if (form.company.trim().length < 2) e.company = "Informe sua empresa";
    if (form.phone.trim().length < 8) e.phone = "Informe um telefone válido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Informe um email válido";
    if (!form.role) e.role = "Selecione seu cargo";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;

    setStatus("submitting");
    try {
      const result = await submitLead(form);
      try {
        const lead: StoredLead = {
          leadId: result.leadId ?? "",
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          role: form.role,
        };
        sessionStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
      } catch {
        // storage indisponível: wizard segue com fallback por email
      }
      router.push("/diagnostico");
    } catch (err) {
      setStatus("error");
      setServerError(
        err instanceof Error ? err.message : "Erro ao enviar cadastro",
      );
    }
  }

  function update(field: keyof LeadInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  const fields = [
    { id: "name", label: "Nome completo", type: "text", placeholder: "Seu nome" },
    { id: "company", label: "Empresa", type: "text", placeholder: "Nome da empresa" },
  ] as const;
  const contactFields = [
    { id: "email", label: "Email corporativo", type: "email", placeholder: "voce@empresa.com" },
    { id: "phone", label: "Telefone", type: "tel", placeholder: "(11) 99999-9999" },
  ] as const;

  function renderField(f: { id: "name" | "company" | "email" | "phone"; label: string; type: string; placeholder: string }) {
    return (
      <div key={f.id}>
        <label htmlFor={f.id} className="rd-label">{f.label}</label>
        <input
          id={f.id}
          type={f.type}
          className={`rd-input ${errors[f.id] ? "error" : ""}`}
          placeholder={f.placeholder}
          value={form[f.id]}
          onChange={(e) => update(f.id, e.target.value)}
        />
        {errors[f.id] && <p className="mt-1 text-xs text-[#b23a34]">{errors[f.id]}</p>}
      </div>
    );
  }

  return (
    <PageShell>
      <Toolbar>
        <a href="#como-funciona" className="rd-link">Como funciona</a>
        <Link href="/admin" className="rd-link">Painel gerencial</Link>
      </Toolbar>

      <section className="rd-container grid flex-1 items-center gap-12 py-16 md:grid-cols-[1fr_512px] md:gap-24">
        <div className="max-w-[640px]">
          <p className="rd-eyebrow mb-5 flex items-center gap-3">
            <span className="h-0.5 w-4 bg-[#4a2c7d]" />
            Diagnóstico de maturidade de dados
          </p>
          <h1 className="rd-h text-4xl leading-[1.1] md:text-5xl">
            Sua empresa está pronta para{" "}
            <span className="text-[#3b2366]">extrair valor real</span> dos dados?
          </h1>
          <p className="mt-6 max-w-[580px] text-base leading-relaxed text-[#6e6e73] md:text-lg">
            Avalie o nível de maturidade da gestão de dados da sua empresa com base no
            framework DAMA-DMBOK. Receba um relatório completo com recomendações práticas.
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#6e6e73]">
            {([["layers", "Framework DAMA-DMBOK"], ["timer", "Menos de 10 minutos"], ["file", "Relatório executivo"]] as const).map(([icon, text]) => (
              <li key={text} className="flex items-center gap-2">
                <Icon name={icon} size={14} />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="rd-card p-8 md:p-[34px]">
          <h2 className="rd-h text-[22px]">Comece seu diagnóstico</h2>
          <p className="mb-6 mt-1 text-[13px] text-[#6e6e73]">
            Preencha os dados abaixo para iniciar agora.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />
            {fields.map(renderField)}
            <div>
              <label htmlFor="role" className="rd-label">Cargo</label>
              <select
                id="role"
                className={`rd-input ${errors.role ? "error" : ""}`}
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
              >
                <option value="" disabled>Selecione seu cargo</option>
                {CARGOS.map((cargo) => (
                  <option key={cargo} value={cargo}>{cargo}</option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-xs text-[#b23a34]">{errors.role}</p>}
            </div>
            {contactFields.map(renderField)}
            {serverError && (
              <p className="rounded-xl bg-[#f9eae8] p-3 text-sm text-[#b23a34]">{serverError}</p>
            )}
            <button type="submit" disabled={status === "submitting"} className="rd-btn mt-2 w-full">
              {status === "submitting" ? "Enviando..." : <>Iniciar diagnóstico <Icon name="arrowRight" /></>}
            </button>
          </form>
        </div>
      </section>

      <section id="como-funciona" className="rd-container pt-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4a2c7d]">Como funciona</span>
          <span className="h-px flex-1 bg-[#1d1d1f1f]" />
          <span className="text-xs text-[#707077]">Sem custo para começar</span>
        </div>
        <div className="rd-card grid gap-8 p-9 md:grid-cols-3 md:gap-0 md:p-9">
          {[
            ["01", "Cadastre-se", "Preencha o formulário ao lado com seus dados e os da sua empresa. Leva menos de 1 minuto."],
            ["02", "Responda o questionário", "Perguntas sobre práticas de gestão de dados da sua empresa. Leva menos de 10 minutos."],
            ["03", "Receba o relatório", "Nosso time comercial analisa seu diagnóstico e envia um relatório detalhado com scores, recomendações e plano de ação."],
          ].map(([n, title, desc], i) => (
            <div key={n} className={`md:px-9 ${i > 0 ? "md:border-l md:border-[#1d1d1f12]" : "md:pl-0"}`}>
              <p className="font-poppins text-[72px] font-semibold leading-none text-[#c9bedb]">{n}</p>
              <h3 className="rd-h mt-6 text-[17px]">{title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-[#6e6e73]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
