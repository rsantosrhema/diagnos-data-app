interface StageHeroProps {
  stage: {
    rotulo: string;
    cor: string;
    range: { min: number; max: number };
    descricaoExecutiva: string;
    caracteristicas: string[];
    sinaisRisco: string[];
    comoSubir: string[];
  };
  score: { valor: number; faixa: string };
}

function rangeText(range: { min: number; max: number }): string {
  return `Faixa ${range.min.toFixed(1)} a ${range.max.toFixed(1)}`;
}

export function StageHero({ stage, score }: StageHeroProps) {
  return (
    <section
      className="rounded-2xl border border-rhema-lavender-light bg-white p-8 shadow-[0_8px_32px_rgba(59,35,102,0.12)] md:p-10"
      aria-label="Estágio de maturidade"
    >
      <p className="font-poppins text-sm font-medium uppercase tracking-wide text-rhema-dark/50">
        Estágio atual · CMMI
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-poppins text-4xl font-bold md:text-5xl" style={{ color: stage.cor }}>
          {stage.rotulo}
        </h2>
        <div className="text-right">
          <p className="font-poppins text-2xl font-bold tabular-nums text-rhema-institutional">
            {score.valor.toFixed(1)}
          </p>
          <p className="font-inter text-xs text-rhema-dark/50">Score final</p>
        </div>
      </div>
      <p className="mt-2 font-inter text-sm text-rhema-dark/50">{rangeText(stage.range)}</p>
      <p className="mt-4 max-w-2xl font-inter text-base leading-relaxed text-rhema-dark/70">
        {stage.descricaoExecutiva}
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="font-poppins text-sm font-semibold uppercase tracking-wide text-rhema-institutional">
            Características deste estágio
          </h3>
          <ul className="mt-3 space-y-2">
            {stage.caracteristicas.map((item) => (
              <li key={item} className="flex gap-2 font-inter text-sm leading-relaxed text-rhema-dark/70">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rhema-primary/60" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-poppins text-sm font-semibold uppercase tracking-wide text-rhema-institutional">
            Sinais de risco
          </h3>
          <ul className="mt-3 space-y-2">
            {stage.sinaisRisco.map((item) => (
              <li key={item} className="flex gap-2 font-inter text-sm leading-relaxed text-rhema-dark/70">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-poppins text-sm font-semibold uppercase tracking-wide text-rhema-institutional">
            Como subir de estágio
          </h3>
          <ul className="mt-3 space-y-2">
            {stage.comoSubir.map((item) => (
              <li key={item} className="flex gap-2 font-inter text-sm leading-relaxed text-rhema-dark/70">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500/70" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
