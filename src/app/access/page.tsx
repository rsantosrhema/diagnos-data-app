"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RhemaLogo } from "../components/RhemaLogo";
import { WaveDivider } from "../components/WaveDivider";
import { validateToken, ApiError } from "@/lib/api/client";

export default function AccessPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError("");

    const cleaned = token.trim().toUpperCase();
    if (cleaned.length !== 6) {
      setError("O token deve ter 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const result = await validateToken(cleaned);
      router.push(result.redirect);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erro ao validar token. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* ─── Header ─── */}
      <header className="bg-rhema-institutional">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/">
            <RhemaLogo variant="dark" width={140} />
          </a>
          <a
            href="/admin"
            className="text-sm font-poppins font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            Painel gerencial
          </a>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="bg-rhema-institutional relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-24 md:pt-16 md:pb-32 text-center">
          <h1 className="font-poppins font-bold text-2xl md:text-4xl text-white mb-4">
            Acessar diagnóstico
          </h1>
          <p className="text-rhema-lavender/80 font-inter text-base max-w-md mx-auto">
            Insira o token de acesso que você recebeu por email.
          </p>
        </div>
        <WaveDivider color="var(--color-rhema-offwhite)" />
      </section>

      {/* ─── Form ─── */}
      <section className="bg-rhema-offwhite -mt-1 flex-1 flex items-start justify-center pt-8 md:pt-16 pb-20">
        <div className="card p-8 md:p-10 w-full max-w-md mx-6 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="token" className="label-field">
                Token de acesso
              </label>
              <input
                id="token"
                type="text"
                className={`input-field text-center text-lg tracking-[0.3em] font-poppins font-semibold uppercase ${error ? "error" : ""}`}
                placeholder="XXXXXX"
                maxLength={6}
                value={token}
                onChange={(e) => {
                  setToken(e.target.value.toUpperCase());
                  if (error) setError("");
                }}
                autoFocus
              />
              {error && (
                <p className="text-red-600 text-xs mt-2 font-inter text-center">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || token.trim().length !== 6}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Validando...
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-rhema-lavender-light text-center">
            <p className="font-inter text-sm text-rhema-dark/60">
              Não tem um token?{" "}
              <a href="/" className="text-rhema-primary font-medium hover:underline">
                Solicite acesso
              </a>
            </p>
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
