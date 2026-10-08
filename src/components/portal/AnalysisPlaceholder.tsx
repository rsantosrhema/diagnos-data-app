interface AnalysisPlaceholderProps {
  status: "pendente" | "processando" | "falha";
  onReprocess?: () => void;
}

export function AnalysisPlaceholder({ status, onReprocess }: AnalysisPlaceholderProps) {
  if (status === "falha") {
    return (
      <div
        className="rounded-2xl border border-rhema-lavender-light bg-white p-10 text-center shadow-[0_8px_32px_rgba(59,35,102,0.12)]"
        data-testid="analysis-placeholder"
      >
        <h3 className="font-poppins text-lg font-semibold text-rhema-institutional">
          Não foi possível concluir a análise
        </h3>
        <p className="mx-auto mt-2 max-w-md font-inter text-sm leading-relaxed text-rhema-dark/60">
          O processamento da análise de mercado falhou. Os dados do diagnóstico
          continuam disponíveis abaixo.
        </p>
        {onReprocess && (
          <button type="button" className="btn-primary mt-6" onClick={onReprocess}>
            Reprocessar
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-rhema-lavender-light bg-white p-10 text-center shadow-[0_8px_32px_rgba(59,35,102,0.12)]"
      data-testid="analysis-placeholder"
    >
      <div
        data-testid="analysis-spinner"
        aria-hidden
        className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-rhema-lavender-light border-t-rhema-primary"
      />
      <h3 className="mt-5 font-poppins text-lg font-semibold text-rhema-institutional">
        Análise de mercado em processamento...
      </h3>
      <p className="mx-auto mt-2 max-w-md font-inter text-sm leading-relaxed text-rhema-dark/60">
        Os dados do diagnóstico já estão disponíveis. A análise de mercado
        aparece aqui assim que concluir.
      </p>
    </div>
  );
}
