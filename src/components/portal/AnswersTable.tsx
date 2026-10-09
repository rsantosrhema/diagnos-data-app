export interface AnswersDimension {
  id: string;
  name: string;
  pergunta: string;
  resposta: string;
  nivel: number;
}

const LEVEL_COLORS = ["#C0392B", "#D97706", "#B7791F", "#3F7D58", "#2F6B4F"];

function clampLevel(level: number): number {
  return Math.min(5, Math.max(1, level));
}

function LevelMeter({ nivel }: { nivel: number }) {
  const clamped = clampLevel(nivel);
  const color = LEVEL_COLORS[clamped - 1];
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: step <= clamped ? color : "var(--color-rhema-lavender-light)",
            }}
          />
        ))}
      </span>
      <span
        className="font-mono text-xs font-semibold tabular-nums"
        style={{ color }}
      >
        N{clamped}
      </span>
    </span>
  );
}

export function AnswersTable({
  dimensions,
}: {
  dimensions: AnswersDimension[];
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-rhema-lavender-light bg-white shadow-[0_8px_32px_rgba(59,35,102,0.08)]"
      aria-label="Respostas do diagnóstico"
    >
      <div className="flex items-center justify-between border-b border-rhema-lavender-light px-6 py-4">
        <h2 className="font-poppins text-lg font-semibold text-rhema-institutional">
          Respostas do diagnóstico
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-rhema-dark/40">
          {dimensions.length} dimensões
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="bg-rhema-lavender-light/40">
              <th className="w-[190px] px-6 py-3 font-poppins text-xs font-medium uppercase tracking-wide text-rhema-dark/60">
                Dimensão
              </th>
              <th className="px-4 py-3 font-poppins text-xs font-medium uppercase tracking-wide text-rhema-dark/60">
                Pergunta
              </th>
              <th className="px-4 py-3 font-poppins text-xs font-medium uppercase tracking-wide text-rhema-dark/60">
                Resposta
              </th>
              <th className="w-[110px] px-6 py-3 text-right font-poppins text-xs font-medium uppercase tracking-wide text-rhema-dark/60">
                Nível
              </th>
            </tr>
          </thead>
          <tbody>
            {dimensions.map((dim, idx) => (
              <tr
                key={dim.id}
                className={`border-b border-rhema-lavender-light/50 transition-colors last:border-0 hover:bg-rhema-lavender-light/20 ${
                  idx % 2 === 1 ? "bg-rhema-offwhite/40" : ""
                }`}
              >
                <td className="px-6 py-4 align-top">
                  <span className="font-poppins text-sm font-semibold text-rhema-institutional">
                    {dim.name}
                  </span>
                </td>
                <td className="px-4 py-4 align-top font-inter text-sm leading-relaxed text-rhema-dark/80">
                  {dim.pergunta}
                </td>
                <td className="px-4 py-4 align-top font-inter text-sm leading-relaxed text-rhema-dark/70">
                  {dim.resposta}
                </td>
                <td className="px-6 py-4 text-right align-top">
                  <LevelMeter nivel={dim.nivel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
