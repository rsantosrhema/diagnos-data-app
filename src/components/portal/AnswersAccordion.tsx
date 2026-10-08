"use client";

import { useState } from "react";

export interface AccordionDimension {
  id: string;
  name: string;
  pergunta: string;
  resposta: string;
  nivel: number;
}

export function AnswersAccordion({ dimensions }: { dimensions: AccordionDimension[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section
      className="rounded-2xl border border-rhema-lavender-light bg-white shadow-[0_8px_32px_rgba(59,35,102,0.12)]"
      aria-label="Respostas do diagnóstico"
    >
      <h2 className="border-b border-rhema-lavender-light px-6 py-4 font-poppins text-lg font-semibold text-rhema-institutional">
        Respostas do diagnóstico
      </h2>
      <ul>
        {dimensions.map((dim, idx) => {
          const open = openIds.has(dim.id);
          return (
            <li
              key={dim.id}
              className={idx < dimensions.length - 1 ? "border-b border-rhema-lavender-light/50" : ""}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(dim.id)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-rhema-lavender-light/20"
              >
                <span className="font-inter text-sm font-medium text-rhema-dark">{dim.pergunta}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="inline-block rounded-full bg-rhema-lavender-light px-2.5 py-1 font-inter text-xs font-medium text-rhema-primary">
                    {dim.name}
                  </span>
                  <svg
                    aria-hidden
                    className={`h-4 w-4 text-rhema-dark/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </span>
              </button>
              {open && (
                <div className="border-t border-rhema-lavender-light/40 bg-rhema-offwhite/60 px-6 py-4" role="region">
                  <p className="font-inter text-sm leading-relaxed text-rhema-dark/70">{dim.resposta}</p>
                  <span className="mt-3 inline-block rounded-full bg-rhema-primary/10 px-2.5 py-1 font-inter text-xs font-semibold text-rhema-primary">
                    Nível {dim.nivel}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
