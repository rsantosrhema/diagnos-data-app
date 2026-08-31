"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RhemaLogo } from "./components/RhemaLogo";
import { WaveDivider } from "./components/WaveDivider";
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

  return (
    <main className="min-h-screen flex flex-col">
      {/* ─── Header ─── */}
      <header className="bg-rhema-institutional">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <RhemaLogo variant="dark" width={140} />
          <div className="flex items-center gap-6">
            <a
              href="/admin"
              className="text-sm font-poppins font-medium text-white/40 hover:text-white/70 transition-colors"
            >
              Painel gerencial
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="bg-rhema-institutional relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-28 md:pt-20 md:pb-36">
          <div className="max-w-2xl">
            <p className="text-rhema-lavender font-poppins text-sm font-medium tracking-wide uppercase mb-4">
              Diagnóstico de Maturidade
            </p>
            <h1 className="font-poppins font-bold text-3xl md:text-5xl text-white leading-tight mb-6">
              Sua empresa está pronta para{" "}
              <span className="text-rhema-lavender">extrair valor real</span>{" "}
              dos dados?
            </h1>
            <p className="text-rhema-lavender/80 font-inter text-base md:text-lg leading-relaxed max-w-xl">
              Avalie o nível de maturidade da gestão de dados da sua empresa com
              base no framework DAMA-DMBOK. Receba um relatório completo com
              recomendações práticas.
            </p>
          </div>
        </div>
        <WaveDivider color="var(--color-rhema-offwhite)" />
      </section>

      {/* ─── Content ─── */}
      <section className="bg-rhema-offwhite -mt-1">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 md:gap-20 items-start">
          {/* Left: info */}
          <div className="animate-fade-in-up">
            <h2 className="font-poppins font-semibold text-2xl md:text-3xl text-rhema-institutional mb-8">
              Como funciona
            </h2>
            <div className="space-y-8">
              {[
                {
                  step: "01",
                  title: "Cadastre-se",
                  desc: "Preencha o formulário ao lado com seus dados e os da sua empresa. Leva menos de 1 minuto.",
                },
                {
                  step: "02",
                  title: "Responda o questionário",
                  desc: "Perguntas sobre práticas de gestão de dados da sua empresa. Leva menos de 10 minutos.",
                },
                {
                  step: "03",
                  title: "Receba o relatório",
                  desc: "Nosso time comercial analisa seu diagnóstico e envia um relatório detalhado com scores, recomendações e plano de ação.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-rhema-primary/10 flex items-center justify-center">
                    <span className="font-poppins font-bold text-rhema-primary text-sm">
                      {item.step}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-rhema-institutional text-lg mb-1">
                      {item.title}
                    </h3>
                    <p className="font-inter text-rhema-dark/70 text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <div className="card p-8 md:p-10 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-poppins font-semibold text-xl text-rhema-institutional mb-1">
              Comece seu diagnóstico
            </h2>
            <p className="font-inter text-sm text-rhema-dark/60 mb-8">
              Preencha os dados abaixo para iniciar agora.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* honeypot */}
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              <div>
                <label htmlFor="name" className="label-field">Nome completo</label>
                <input
                  id="name"
                  type="text"
                  className={`input-field ${errors.name ? "error" : ""}`}
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
                {errors.name && <p className="text-red-600 text-xs mt-1 font-inter">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="company" className="label-field">Empresa</label>
                <input
                  id="company"
                  type="text"
                  className={`input-field ${errors.company ? "error" : ""}`}
                  placeholder="Nome da empresa"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                />
                {errors.company && <p className="text-red-600 text-xs mt-1 font-inter">{errors.company}</p>}
              </div>

              <div>
                <label htmlFor="role" className="label-field">Cargo</label>
                <select
                  id="role"
                  className={`input-field ${errors.role ? "error" : ""}`}
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                >
                  <option value="" disabled>
                    Selecione seu cargo
                  </option>
                  {CARGOS.map((cargo) => (
                    <option key={cargo} value={cargo}>
                      {cargo}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="text-red-600 text-xs mt-1 font-inter">{errors.role}</p>}
              </div>

              <div>
                <label htmlFor="email" className="label-field">Email corporativo</label>
                <input
                  id="email"
                  type="email"
                  className={`input-field ${errors.email ? "error" : ""}`}
                  placeholder="voce@empresa.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
                {errors.email && <p className="text-red-600 text-xs mt-1 font-inter">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="label-field">Telefone</label>
                <input
                  id="phone"
                  type="tel"
                  className={`input-field ${errors.phone ? "error" : ""}`}
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
                {errors.phone && <p className="text-red-600 text-xs mt-1 font-inter">{errors.phone}</p>}
              </div>

              {serverError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm font-inter">{serverError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-primary w-full"
              >
                {status === "submitting" ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  "Iniciar diagnóstico"
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-rhema-institutional mt-auto">
        <WaveDivider flip color="var(--color-rhema-institutional)" className="-mb-1" />
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <RhemaLogo variant="dark" width={120} />
          <p className="font-inter text-xs text-white/50">
            &copy; {new Date().getFullYear()} Rhema Data. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
