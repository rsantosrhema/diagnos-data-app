"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { PageShell, Toolbar, Icon } from "../components/PageShell";
import { submitScreener, ApiError } from "@/lib/api/client";
import {
  SCREENER_CONTRACT,
  DIMENSION_IDS,
  PERFIL_IDS,
  COMMERCIAL_ID,
} from "@/lib/screener/contract";
import {
  LEAD_STORAGE_KEY,
  readStoredLead,
  clearStoredLead,
} from "@/lib/lead-storage";

const STORAGE_KEY = "diagnos_screener_draft";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface DraftEnvelope {
  savedAt: number;
  data: FormData;
}

interface FormData {
  leadId: string;
  name: string;
  email: string;
  company: string;
  consent: boolean;
  profile: Record<string, string>;
  answers: Record<string, number>;
  commercialAnswer: string;
}

const EMPTY_FORM: FormData = {
  leadId: "",
  name: "",
  email: "",
  company: "",
  consent: false,
  profile: {},
  answers: {},
  commercialAnswer: "",
};

const LEVEL_LABELS = [
  "Não fazemos",
  "Pontual",
  "Definido",
  "Gerenciado",
  "Otimizado",
];

type Step =
  | { kind: "info" }
  | { kind: "dimension"; index: number }
  | { kind: "commercial" }
  | { kind: "consent" };

const TOTAL_STEPS =
  1 + DIMENSION_IDS.length + 1 + 1; // info + dims + commercial + consent

function loadDraft(): FormData {
  if (typeof window === "undefined") return EMPTY_FORM;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_FORM;
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope> | FormData;
    // envelope novo: expira após DRAFT_TTL_MS (PII não deve persistir indefinidamente)
    if ("savedAt" in parsed && parsed.savedAt && parsed.data) {
      if (Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return EMPTY_FORM;
      }
      return { ...EMPTY_FORM, ...(parsed.data as FormData) };
    }
    // formato legado (sem TTL): descartar para forçar re-save com envelope
    return { ...EMPTY_FORM, ...(parsed as FormData) };
  } catch {
    return EMPTY_FORM;
  }
}

function saveDraft(data: FormData): void {
  try {
    const envelope: DraftEnvelope = { savedAt: Date.now(), data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
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
    const stored = readStoredLead();
    const draft = loadDraft();
    setForm({
      ...draft,
      ...(stored
        ? {
            leadId: stored.leadId,
            name: stored.name,
            email: stored.email,
            company: stored.company,
          }
        : {}),
    });
  }, []);

  useEffect(() => {
    if (form !== EMPTY_FORM) saveDraft(form);
  }, [form]);

  const stepIndex = useCallback((): number => {
    if (step.kind === "info") return 0;
    if (step.kind === "dimension") return 1 + step.index;
    if (step.kind === "commercial") return 1 + DIMENSION_IDS.length;
    return 1 + DIMENSION_IDS.length + 1; // consent
  }, [step]);

  const progress = ((stepIndex() + 1) / TOTAL_STEPS) * 100;

  function update<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function updateProfile(id: string, value: string) {
    setForm((prev) => ({
      ...prev,
      profile: { ...prev.profile, [id]: value },
    }));
    if (errors[`prof_${id}`]) setErrors((prev) => ({ ...prev, [`prof_${id}`]: "" }));
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
    for (const pid of PERFIL_IDS) {
      if (!form.profile[pid]) e[`prof_${pid}`] = "Selecione uma opção";
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
      setStep({ kind: "dimension", index: 0 });
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
    if (step.kind === "dimension") {
      if (step.index > 0) setStep({ kind: "dimension", index: step.index - 1 });
      else setStep({ kind: "info" });
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
        leadId: form.leadId || undefined,
        name: form.name.trim(),
        email: form.email.trim(),
        consent: form.consent,
        consentText: SCREENER_CONTRACT.meta.aviso_metodologico,
        context: {},
        profile: form.profile,
        answers: DIMENSION_IDS.map((id) => ({
          dimensionId: id,
          nivel: form.answers[id],
        })),
        commercialAnswer: form.commercialAnswer,
        company: {
          name: form.company.trim(),
          size: form.profile["perfil_02"],
        },
      });
      setStatus("success");
      clearDraft();
      try {
        sessionStorage.removeItem(LEAD_STORAGE_KEY);
      } catch {
        // ignore
      }
    } catch (err) {
      setStatus("error");
      setServerError(
        err instanceof ApiError ? err.message : "Erro ao enviar diagnóstico",
      );
    }
  }

  if (status === "success") {
    return (
      <PageShell>
        <Toolbar>
          <span className="rd-pill rd-pill--ok gap-1.5 uppercase tracking-[0.1em]">
            <Icon name="check" size={11} /> Concluído
          </span>
        </Toolbar>
        <section className="flex flex-1 items-center justify-center px-6 pb-24">
          <div className="rd-card w-full max-w-[580px] p-11 text-center animate-fade-in-up">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e9f3ee] text-[#2e7d57]">
              <Icon name="check" size={28} />
            </div>
            <h1 className="rd-h text-[32px]">Diagnóstico enviado!</h1>
            <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-relaxed text-[#6e6e73]">
              Recebemos suas respostas. Nosso time comercial fará a análise e entrará em contato.
            </p>
            <div className="mx-auto my-7 h-px bg-[#1d1d1f12]" />
            <h2 className="rd-h text-[17px]">Obrigado!</h2>
            <p className="mt-2 text-[13px] text-[#6e6e73]">
              Nosso time comercial fará a análise do seu diagnóstico e entrará em contato.
            </p>
            <a href="/" className="rd-btn rd-btn--sm mt-7">
              Voltar ao início <Icon name="arrowRight" size={14} />
            </a>
          </div>
        </section>
      </PageShell>
    );
  }

  let questionTitle = "";
  let questionSub = "";
  let questionBody: React.ReactNode = null;

  const errorText = (msg?: string) =>
    msg ? <p className="mt-1 text-xs text-[#b23a34]">{msg}</p> : null;

  if (step.kind === "info") {
    questionTitle = `Olá, ${form.name || "visitante"}`;
    questionSub = `Responda essas perguntas para entendermos mais sobre a ${form.company || "sua empresa"}.`;
    questionBody = (
      <div className="space-y-5">
        {SCREENER_CONTRACT.perfil_empresa.map((profQ) => (
          <div key={profQ.id}>
            <label htmlFor={profQ.id} className="rd-label">{profQ.pergunta}</label>
            <select
              id={profQ.id}
              className={`rd-input h-[52px] font-medium ${errors[`prof_${profQ.id}`] ? "error" : ""} ${form.profile[profQ.id] ? "" : "text-[#6e6e73]"}`}
              value={form.profile[profQ.id] || ""}
              onChange={(e) => updateProfile(profQ.id, e.target.value)}
            >
              <option value="" disabled>Selecione</option>
              {profQ.opcoes.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errorText(errors[`prof_${profQ.id}`])}
          </div>
        ))}
      </div>
    );
  } else if (step.kind === "dimension") {
    const dimId = DIMENSION_IDS[step.index];
    const dim = SCREENER_CONTRACT.dimensoes.find((d) => d.id === dimId)!;
    questionTitle = dim.pergunta;
    questionSub = "Escolha o nível que melhor descreve a realidade da empresa.";
    questionBody = (
      <div className="space-y-2.5">
        {dim.opcoes.map((opt) => {
          const isSelected = form.answers[dimId] === opt.nivel;
          return (
            <button key={opt.nivel} type="button" onClick={() => updateAnswer(dimId, opt.nivel)} className="rd-option" data-selected={isSelected}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${isSelected ? "bg-[#4a2c7d] text-white" : "bg-[#f5f4f8] text-[#6e6e73]"}`}>{opt.nivel}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-[#1d1d1f]">{LEVEL_LABELS[opt.nivel - 1]}</span>
                <span className="mt-0.5 block text-xs text-[#6e6e73]">{opt.texto}</span>
              </span>
              {isSelected && <Icon name="check" className="text-[#4a2c7d]" />}
            </button>
          );
        })}
        {errorText(errors[`ans_${dimId}`])}
      </div>
    );
  } else if (step.kind === "commercial") {
    const cta = SCREENER_CONTRACT.pergunta_comercial;
    questionTitle = cta.pergunta;
    questionBody = (
      <div className="space-y-2.5">
        {cta.opcoes.map((opt) => {
          const isSelected = form.commercialAnswer === opt;
          return (
            <button key={opt} type="button" onClick={() => update("commercialAnswer", opt)} className="rd-option h-14" data-selected={isSelected}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] ${isSelected ? "border-[#4a2c7d]" : "border-[#1d1d1f33]"}`}>
                {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[#4a2c7d]" />}
              </span>
              <span className="text-sm text-[#1d1d1f]">{opt}</span>
            </button>
          );
        })}
        <p className="flex items-center gap-2 pt-3 text-xs text-[#6e6e73]">
          <Icon name="info" size={14} />
          Pergunta não pontuada: entra como gancho comercial e qualificação de dor, não no cálculo de maturidade.
        </p>
      </div>
    );
  } else {
    questionTitle = "Consentimento";
    questionBody = (
      <div className="space-y-4">
        <p className="flex gap-3 rounded-xl bg-[#f5f4f8] p-4 text-[13px] leading-relaxed text-[#6e6e73]">
          <Icon name="info" size={14} className="mt-0.5 shrink-0" />
          {SCREENER_CONTRACT.meta.aviso_metodologico}
        </p>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#1d1d1f1f] p-4">
          <input type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#4a2c7d]" />
          <span className="text-sm leading-relaxed text-[#6e6e73]">
            Autorizo o uso dos meus dados para fins de diagnóstico de maturidade de dados e contato comercial pela Rhema Data.
          </span>
        </label>
        {errorText(errors.consent)}
      </div>
    );
  }

  const isLastStep = step.kind === "consent";
  const dimBadge =
    step.kind === "dimension"
      ? SCREENER_CONTRACT.dimensoes[step.index].nome
      : step.kind === "commercial"
        ? "Comercial"
        : step.kind === "consent"
          ? "Consentimento"
          : "Seus dados";

  return (
    <PageShell>
      <Toolbar>
        <span className="rd-eyebrow">
          Etapa {stepIndex() + 1} de {TOTAL_STEPS}
        </span>
        <div className="flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span key={i} className={`h-1 w-[11px] rounded-sm ${i <= stepIndex() ? "bg-[#4a2c7d]" : "bg-[#1d1d1f1a]"}`} />
          ))}
        </div>
      </Toolbar>

      <section className="flex flex-1 items-start justify-center px-6 pb-32 pt-12 md:pt-16">
        <div className="rd-card w-full max-w-[760px] px-6 py-8 md:px-11 md:py-10 animate-fade-in" key={`${step.kind}-${step.kind === "dimension" ? step.index : 0}`}>
          <div className="flex flex-col gap-3.5 pb-7">
            <span className="rd-badge">{dimBadge}</span>
            <h2 className="rd-h text-2xl leading-tight md:text-[32px]">{questionTitle}</h2>
            {questionSub && <p className="text-sm text-[#6e6e73]">{questionSub}</p>}
          </div>
          {questionBody}
          {serverError && (
            <p className="mt-4 rounded-xl bg-[#f9eae8] p-3 text-sm text-[#b23a34]">{serverError}</p>
          )}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 flex justify-center px-6 pb-6">
        <div className="flex w-full max-w-[1280px] items-center justify-between rounded-[18px] bg-[#fafafa] px-6 py-4 shadow-[0_8px_24px_#00000012]">
          <button type="button" onClick={goBack} disabled={step.kind === "info"} className="rd-link flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
            <Icon name="arrowLeft" size={14} /> Anterior
          </button>
          {isLastStep ? (
            <button type="button" onClick={handleSubmit} disabled={!form.consent || status === "submitting"} className="rd-btn rd-btn--sm">
              {status === "submitting" ? "Enviando..." : <>Enviar diagnóstico <Icon name="arrowRight" size={14} /></>}
            </button>
          ) : (
            <button type="button" onClick={goNext} className="rd-btn rd-btn--sm">
              Próxima <Icon name="arrowRight" size={14} />
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
