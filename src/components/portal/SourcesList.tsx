export interface PortalSource {
  url: string;
  titulo?: string;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function SourcesList({ sources }: { sources: PortalSource[] }) {
  if (sources.length === 0) {
    return (
      <p className="rounded-2xl border border-rhema-lavender-light bg-white px-6 py-8 text-center font-inter text-sm text-rhema-dark/50 shadow-[0_8px_32px_rgba(59,35,102,0.12)]">
        Sem fontes de mercado para exibir.
      </p>
    );
  }

  return (
    <ul className="rounded-2xl border border-rhema-lavender-light bg-white p-6 shadow-[0_8px_32px_rgba(59,35,102,0.12)]">
      {sources.map((source, idx) => (
        <li
          key={`${source.url}-${idx}`}
          className={idx < sources.length - 1 ? "border-b border-rhema-lavender-light/40 pb-3" : "pt-0.5"}
        >
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-inter text-sm text-rhema-primary transition-colors hover:underline"
          >
            {source.titulo ?? hostnameOf(source.url)}
          </a>
          <p className="mt-0.5 truncate font-mono text-[11px] text-rhema-dark/40">{source.url}</p>
        </li>
      ))}
    </ul>
  );
}
