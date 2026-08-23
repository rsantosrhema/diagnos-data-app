"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { RhemaLogo } from "../components/RhemaLogo";
import { WaveDivider } from "../components/WaveDivider";
import { submitScreener, ApiError } from "@/lib/api/client";
import {
  SCREENER_CONTRACT,
  DIMENSION_IDS,
  CONTEXT_IDS,
  COMMERCIAL_ID,
} from "@/lib/screener/contract";

const STORAGE_KEY = "diagnos_screener_draft";

interface FormData {
  name: string;
  role: string;
  email: string;
  consent: boolean;
  context: Record<string, string>;
  answers: Record<string, number>;
  commercialAnswer: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  role: "",
  email: "",
  consent: false,
  context: {},
  answers: {},
  commercialAnswer: "",
};

type Step =
  | { kind: "info" }
  | { kind: "context"; index: number }
  | { kind: "dimension"; index: number }
  | { kind: "commercial" }
  | { kind: "consent" };

const TOTAL_STEPS =
  1 + CONTEXT_IDS.length + DIMENSION_IDS.length + 1 + 1; // info + ctx + dims + commercial + consent

function loadDraft(): FormData {
  if (typeof window === "undefined") return EMPTY_FORM;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_FORM;
    return { ...EMPTY_FORM, ...JSON.parse(raw) };
  } catch {
    return EMPTY_FORM;
  }
}

function saveDraft(data: FormData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function DiagnosticoPage() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [step, setStep] = useState<Step>({ kind: "info" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    setForm(loadDraft());
  }, []);

  useEffect(() => {
    if (form !== EMPTY_FORM) saveDraft(form);
  }, [form]);

  const stepIndex = useCallback((): number => {
    if (step.kind === "info") return 0;
    if (step.kind === "context") return 1 + step.index;
    if (step.kind === "dimension") return 1 + CONTEXT_IDS.length + step.index;
    if (step.kind === "commercial") return 1 + CONTEXT_IDS.length + DIMENSION_IDS.length;
    return 1 + CONTEXT_IDS.length + DIMENSION_IDS.length + 1; // consent
  }, [step]);

  const progress = ((stepIndex() + 1) / TOTAL_STEPS) * 100;

  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function updateContext(id: string, value: string) {
    setForm((prev) => ({
      ...prev,
      context: { ...prev.context, [id]: value },
    }));
    if (errors[`ctx_${id}`]) setErrors((prev) => ({ ...prev, [`ctx_${id}`]: "" }));
  }

  function updateAnswer(dimId: string, nivel: number) {
    setForm((prev) => ({
      ...prev,
      answers: { ...prev.answers, [dimId]: nivel },
    }));
    if (errors[`ans_${dimId}`]) setErrors((prev) => ({ ...prev, [`ans_${dimId}`]: "" }));
  }

  function validateInfo(): boolean {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Informe seu nome";
    if (form.role.trim().length < 2) e.role = "Informe seu cargo";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Informe um email válido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateContext(): boolean {
    const e: Record<string, string> = {};
    for (const id of CONTEXT_IDS) {
      if (!form.context[id]) e[`ctx_${id}`] = "Selecione uma opção";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateDimension(dimId: string): boolean {
    if (form.answers[dimId] !== undefined) return true;
    setErrors({ [`ans_${dimId}`]: "Selecione uma opção" });
    return false;
  }

  function validateConsent(): boolean {
    if (!form.consent) {
      setErrors({ consent: "É necessário consentir para receber o diagnóstico" });
      return false;
    }
    return true;
  }

  function goNext() {
    if (step.kind === "info") {
      if (!validateInfo()) return;
      setStep({ kind: "context", index: 0 });
    } else if (step.kind === "context") {
      if (!validateContext()) return;
      if (step.index < CONTEXT_IDS.length - 1) {
        setStep({ kind: "context", index: step.index + 1 });
      } else {
        setStep({ kind: "dimension", index: 0 });
      }
    } else if (step.kind === "dimension") {
      const dimId = DIMENSION_IDS[step.index];
      if (!validateDimension(dimId)) return;
      if (step.index < DIMENSION_IDS.length - 1) {
        setStep({ kind: "dimension", index: step.index + 1 });
      } else {
        setStep({ kind: "commercial" });
      }
    } else if (step.kind === "commercial") {
      setStep({ kind: "consent" });
    }
  }

  function goBack() {
    if (step.kind === "context") {
      if (step.index > 0) setStep({ kind: "context", index: step.index - 1 });
      else setStep({ kind: "info" });
    } else if (step.kind === "dimension") {
      if (step.index > 0) setStep({ kind: "dimension", index: step.index - 1 });
      else setStep({ kind: "context", index: CONTEXT_IDS.length - 1 });
    } else if (step.kind === "commercial") {
      setStep({ kind: "dimension", index: DIMENSION_IDS.length - 1 });
    } else if (step.kind === "consent") {
      setStep({ kind: "commercial" });
    }
  }

  async function handleSubmit() {
    if (!validateConsent()) return;
    setStatus("submitting");
    setServerError("");

    try {
      await submitScreener({
        name: form.name.trim(),
        role: form.role.trim(),
        email: form.email.trim(),
        consent: form.consent,
        consentText: SCREENER_CONTRACT.meta.aviso_metodologico,
        context: form.context,
        answers: DIMENSION_IDS.map((id) => ({
          dimensionId: id,
          nivel: form.answers[id],
        })),
        commercialAnswer: form.commercialAnswer,
      });
      setStatus("success");
      clearDraft();
    } catch (err) {
      setStatus("error");
      setServerError(
        err instanceof ApiError ? err.message : "Erro ao enviar diagnóstico",
      );
    }
  }

  // ─── Success state ───
  if (status === "success") {
    return (
      <main className="min-h-screen flex flex-col">
        <header className="bg-rhema-institutional">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <RhemaLogo variant="dark" width={140} />
          </div>
        </header>
        <section className="bg-rhema-institutional relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 pt-12 pb-24 md:pt-20 md:pb-32 text-center">
            <h1 className="font-poppins font-bold text-2xl md:text-4xl text-white mb-4">
              Diagnóstico enviado!
            </h1>
            <p className="text-rhema-lavender/80 font-inter text-base max-w-lg mx-auto">
              Seu relatório está sendo gerado. Nosso time comercial receberá o
              resultado e entrará em contato.
            </p>
          </div>
          <WaveDivider color="var(--color-rhema-offwhite)" />
        </section>
        <section className="bg-rhema-offwhite -mt-1 flex-1 flex items-center justify-center pb-20">
          <div className="card p-10 text-center max-w-md mx-6 animate-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-poppins font-semibold text-xl text-rhema-institutional mb-3">
              Obrigado!
            </h2>
            <p className="font-inter text-sm text-rhema-dark/70 leading-relaxed">
              Em breve nosso time comercial receberá seu diagnóstico e entrará em contato.
            </p>
          </div>
        </section>
      </main>
    );
  }

  // ─── Current question data ───
  let questionTitle = "";
  let questionBody: React.ReactNode = null;

  if (step.kind === "info") {
    questionTitle = "Seus dados";
    questionBody = (
      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="label-field">Nome completo</label>
          <input id="name" type="text" className={`input-field ${errors.name ? "error" : ""}`} placeholder="Seu nome" value={form.name} onChange={(e) => update("name", e.target.value)} autoFocus />
          {errors.name && <p className="text-red-600 text-xs mt-1 font-inter">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="role" className="label-field">Cargo</label>
          <input id="role" type="text" className={`input-field ${errors.role ? "error" : ""}`} placeholder="Seu cargo na empresa" value={form.role} onChange={(e) => update("role", e.target.value)} />
          {errors.role && <p className="text-red-600 text-xs mt-1 font-inter">{errors.role}</p>}
        </div>
        <div>
          <label htmlFor="email" className="label-field">Email corporativo</label>
          <input id="email" type="email" className={`input-field ${errors.email ? "error" : ""}`} placeholder="voce@empresa.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
          {errors.email && <p className="text-red-600 text-xs mt-1 font-inter">{errors.email}</p>}
        </div>
      </div>
    );
  } else if (step.kind === "context") {
    const ctxId = CONTEXT_IDS[step.index];
    const ctxQ = SCREENER_CONTRACT.perguntas_contexto.find((q) => q.id === ctxId)!;
    questionTitle = ctxQ.pergunta;
    questionBody = (
      <div className="space-y-3">
        {ctxQ.opcoes.map((opt) => {
          const isSelected = form.context[ctxId] === opt;
          return (
            <button key={opt} onClick={() => updateContext(ctxId, opt)} className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200 ${isSelected ? "border-rhema-primary bg-rhema-primary/5 shadow-sm" : "border-rhema-lavender-light bg-white hover:border-rhema-lavender hover:shadow-sm"}`}>
              <p className={`font-poppins font-medium text-sm ${isSelected ? "text-rhema-primary" : "text-rhema-institutional"}`}>{opt}</p>
            </button>
          );
        })}
        {errors[`ctx_${ctxId}`] && <p className="text-red-600 text-xs font-inter">{errors[`ctx_${ctxId}`]}</p>}
      </div>
    );
  } else if (step.kind === "dimension") {
    const dimId = DIMENSION_IDS[step.index];
    const dim = SCREENER_CONTRACT.dimensoes.find((d) => d.id === dimId)!;
    questionTitle = dim.pergunta;
    questionBody = (
      <div className="space-y-3">
        {dim.opcoes.map((opt) => {
          const isSelected = form.answers[dimId] === opt.nivel;
          return (
            <button key={opt.nivel} onClick={() => updateAnswer(dimId, opt.nivel)} className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200 ${isSelected ? "border-rhema-primary bg-rhema-primary/5 shadow-sm" : "border-rhema-lavender-light bg-white hover:border-rhema-lavender hover:shadow-sm"}`}>
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-poppins font-semibold transition-colors ${isSelected ? "bg-rhema-primary text-white" : "bg-rhema-lavender-light text-rhema-dark/50"}`}>{opt.nivel}</div>
                <p className={`font-poppins font-medium text-sm ${isSelected ? "text-rhema-primary" : "text-rhema-institutional"}`}>{opt.texto}</p>
              </div>
            </button>
          );
        })}
        {errors[`ans_${dimId}`] && <p className="text-red-600 text-xs font-inter">{errors[`ans_${dimId}`]}</p>}
      </div>
    );
  } else if (step.kind === "commercial") {
    const cta = SCREENER_CONTRACT.pergunta_comercial;
    questionTitle = cta.pergunta;
    questionBody = (
      <div className="space-y-3">
        {cta.opcoes.map((opt) => {
          const isSelected = form.commercialAnswer === opt;
          return (
            <button key={opt} onClick={() => update("commercialAnswer", opt)} className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200 ${isSelected ? "border-rhema-primary bg-rhema-primary/5 shadow-sm" : "border-rhema-lavender-light bg-white hover:border-rhema-lavender hover:shadow-sm"}`}>
              <p className={`font-poppins font-medium text-sm ${isSelected ? "text-rhema-primary" : "text-rhema-institutional"}`}>{opt}</p>
            </button>
          );
        })}
      </div>
    );
  } else {
    // consent
    questionTitle = "Consentimento";
    questionBody = (
      <div className="space-y-4">
        <p className="font-inter text-sm text-rhema-dark/70 leading-relaxed">
          {SCREENER_CONTRACT.meta.aviso_metodologico}
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} className="mt-1 h-5 w-5 rounded border-rhema-lavender text-rhema-primary focus:ring-rhema-primary" />
          <span className="font-inter text-sm text-rhema-dark">
            Autorizo o uso dos meus dados para fins de diagnóstico de maturidade de dados e contato comercial pela Rhema Data.
          </span>
        </label>
        {errors.consent && <p className="text-red-600 text-xs font-inter">{errors.consent}</p>}
      </div>
    );
  }

  const isLastStep = step.kind === "consent";
  const dimBadge =
    step.kind === "dimension"
      ? SCREENER_CONTRACT.dimensoes[step.index].nome
      : step.kind === "context"
        ? "Contexto"
        : step.kind === "commercial"
          ? "Comercial"
          : step.kind === "consent"
            ? "Consentimento"
            : "Seus dados";

  return (
    <main className="min-h-screen flex flex-col bg-rhema-offwhite">
      {/* Header */}
      <header className="bg-white border-b border-rhema-lavender-light">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <RhemaLogo variant="light" width={110} />
          <span className="font-inter text-sm text-rhema-dark/50">
            {stepIndex() + 1} de {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-1 bg-rhema-lavender-light">
          <div className="h-full bg-rhema-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Question */}
      <section className="flex-1 flex items-start justify-center pt-8 md:pt-16 pb-28 px-6">
        <div className="w-full max-w-2xl animate-fade-in" key={`${step.kind}-${step.kind === "context" || step.kind === "dimension" ? step.index : 0}`}>
          <div className="mb-6">
            <span className="inline-block font-poppins text-xs font-medium tracking-wide uppercase text-rhema-primary bg-rhema-primary/10 px-3 py-1.5 rounded-full">
              {dimBadge}
            </span>
          </div>
          <h2 className="font-poppins font-semibold text-xl md:text-2xl text-rhema-institutional leading-snug mb-8">
            {questionTitle}
          </h2>
          {questionBody}
          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <p className="text-red-700 text-sm font-inter">{serverError}</p>
            </div>
          )}
        </div>
      </section>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-rhema-lavender-light">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={goBack} disabled={step.kind === "info"} className="font-poppins text-sm font-medium text-rhema-dark/50 hover:text-rhema-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            &larr; Anterior
          </button>
          {isLastStep ? (
            <button onClick={handleSubmit} disabled={!form.consent || status === "submitting"} className="btn-primary">
              {status === "submitting" ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enviando...
                </span>
              ) : (
                "Enviar diagnóstico"
              )}
            </button>
          ) : (
            <button onClick={goNext} className="btn-primary">
              Próxima &rarr;
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
