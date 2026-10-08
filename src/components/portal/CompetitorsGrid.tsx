export interface PortalCompetitor {
  nome: string;
  contexto: string;
  url?: string;
  diferencial?: string;
}

export function CompetitorsGrid({ competitors }: { competitors: PortalCompetitor[] }) {
  if (competitors.length === 0) {
    return (
      <p className="font-inter text-sm text-rhema-dark/50">
        Sem concorrentes mapeados para este diagnóstico.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {competitors.map((competitor) => (
        <article
          key={competitor.nome}
          className="rounded-2xl border border-rhema-lavender-light bg-white p-6 shadow-[0_8px_32px_rgba(59,35,102,0.12)]"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-poppins text-base font-semibold text-rhema-institutional">
              {competitor.nome}
            </h3>
            {competitor.url && (
              <a
                href={competitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-inter text-xs text-rhema-primary transition-colors hover:underline"
              >
                Visitar site ↗
              </a>
            )}
          </div>
          <p className="mt-2 font-inter text-sm leading-relaxed text-rhema-dark/70">
            {competitor.contexto}
          </p>
          {competitor.diferencial && (
            <p className="mt-3 border-l-2 border-rhema-primary/40 pl-3 font-inter text-sm leading-relaxed text-rhema-dark/70">
              <span className="font-medium text-rhema-primary">Diferencial: </span>
              {competitor.diferencial}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
