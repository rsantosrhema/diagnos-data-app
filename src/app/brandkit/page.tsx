"use client";

import { WaveDivider } from "../components/WaveDivider";

const PRIMARY_COLORS = [
  {
    name: "Roxo primario",
    hex: "#4A2C7D",
    rgb: "R:74  G:44  B:125",
    className: "bg-[#4A2C7D]",
  },
  {
    name: "Preto neutro",
    hex: "#333333",
    rgb: "R:51  G:51  B:51",
    className: "bg-[#333333]",
  },
];

const SECONDARY_COLORS = [
  {
    name: "Roxo institucional",
    hex: "#3B2366",
    rgb: "R:59  G:35  B:102",
    className: "bg-[#3B2366]",
  },
  {
    name: "Lavanda suave",
    hex: "#D9D5E0",
    rgb: "R:217  G:213  B:224",
    className: "bg-[#D9D5E0]",
  },
  {
    name: "Branco",
    hex: "#FFFFFF",
    rgb: "R:255  G:255  B:255",
    className: "bg-[#FFFFFF]",
  },
  {
    name: "Off-white",
    hex: "#F8F7FC",
    rgb: "R:248  G:247  B:252",
    className: "bg-[#F8F7FC]",
  },
];

function ColorCard({
  name,
  hex,
  rgb,
  className,
  light,
}: (typeof SECONDARY_COLORS)[number] & { light?: boolean }) {
  const textColor = light ? "text-rhema-dark" : "text-white";
  const borderClass = light ? "border border-rhema-dark/10" : "";

  return (
    <div className={`${className} ${borderClass} rounded-xl p-6 flex flex-col justify-end h-32`}>
      <p className={`font-poppins font-semibold text-sm ${textColor}`}>{name}</p>
      <p className={`font-inter text-xs ${textColor} opacity-70`}>{hex}</p>
      <p className={`font-inter text-xs ${textColor} opacity-50`}>{rgb}</p>
    </div>
  );
}

export default function BrandKitPage() {
  return (
    <main className="min-h-screen bg-rhema-offwhite">
      {/* Header */}
      <header className="bg-rhema-institutional">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.svg" alt="Rhema Data" width={140} height={45} />
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-24 md:pb-28">
          <p className="text-rhema-lavender font-poppins text-sm font-medium tracking-wide uppercase mb-3">
            Guia de marca
          </p>
          <h1 className="font-poppins font-bold text-3xl md:text-5xl text-white leading-tight mb-4">
            Brandkit
          </h1>
          <p className="text-rhema-lavender/80 font-inter text-base max-w-xl">
            Cores, tipografia e logotipos oficiais da Rhema Data para uso em
            todos os produtos e materiais.
          </p>
        </div>
        <WaveDivider color="var(--color-rhema-offwhite)" />
      </header>

      <div className="-mt-1 max-w-6xl mx-auto px-6 py-16 md:py-24 space-y-20">
        {/* ─── Paleta de cores ─── */}
        <section>
          <h2 className="font-poppins font-semibold text-2xl text-rhema-institutional mb-8">
            Paleta de cores
          </h2>

          <div className="mb-10">
            <h3 className="font-inter text-sm font-medium text-rhema-dark/50 uppercase tracking-wider mb-4">
              Cores principais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRIMARY_COLORS.map((c) => (
                <ColorCard key={c.hex} {...c} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-inter text-sm font-medium text-rhema-dark/50 uppercase tracking-wider mb-4">
              Cores secundarias
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SECONDARY_COLORS.map((c) => (
                <ColorCard key={c.hex} {...c} light={c.hex === "#FFFFFF" || c.hex === "#F8F7FC"} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── Tipografia ─── */}
        <section>
          <h2 className="font-poppins font-semibold text-2xl text-rhema-institutional mb-8">
            Tipografia
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-8">
              <p className="font-poppins font-normal text-rhema-dark/40 text-xs uppercase tracking-widest mb-3">
                Headings
              </p>
              <p className="font-poppins font-bold text-3xl text-rhema-institutional mb-2">
                Poppins
              </p>
              <p className="font-poppins font-semibold text-xl text-rhema-primary mb-1">
                Semibold - Títulos e headings
              </p>
              <p className="font-poppins font-medium text-base text-rhema-dark/60">
                Medium - Destaques na hierarquia
              </p>
            </div>

            <div className="card p-8">
              <p className="font-inter font-normal text-rhema-dark/40 text-xs uppercase tracking-widest mb-3">
                Corpo
              </p>
              <p className="font-inter font-medium text-xl text-rhema-institutional mb-2">
                Inter
              </p>
              <p className="font-inter text-rhema-dark mb-1">
                Regular - Parágrafos e conteúdo
              </p>
              <p className="font-inter text-sm text-rhema-dark/60">
                Medium - Labels, botões e navegação
              </p>
            </div>
          </div>
        </section>

        {/* ─── Logotipos ─── */}
        <section>
          <h2 className="font-poppins font-semibold text-2xl text-rhema-institutional mb-8">
            Variacoes de logotipo
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Dark background */}
            <div className="bg-rhema-institutional rounded-2xl flex items-center justify-center p-10 min-h-[240px]">
              <div className="text-center">
                <p className="font-inter text-xs text-white/40 uppercase tracking-widest mb-6">
                  Tema escuro
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-dark.svg" alt="Rhema Data — tema escuro" width={200} height={65} />
              </div>
            </div>

            {/* Light background */}
            <div className="bg-white rounded-2xl border border-rhema-lavender-light flex items-center justify-center p-10 min-h-[240px]">
              <div className="text-center">
                <p className="font-inter text-xs text-rhema-dark/40 uppercase tracking-widest mb-6">
                  Tema claro
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-light.svg" alt="Rhema Data — tema claro" width={240} height={71} />
              </div>
            </div>
          </div>

          {/* Download links */}
          <div className="mt-6 flex items-center gap-4">
            <a
              href="/logo-dark.svg"
              download="rhema-data-logo-dark.svg"
              className="btn-secondary text-sm"
            >
              Baixar tema escuro (.svg)
            </a>
            <a
              href="/logo-light.svg"
              download="rhema-data-logo-light.svg"
              className="btn-secondary text-sm"
            >
              Baixar tema claro (.svg)
            </a>
          </div>
        </section>

        {/* ─── Boas práticas ─── */}
        <section>
          <h2 className="font-poppins font-semibold text-2xl text-rhema-institutional mb-6">
            Boas praticas
          </h2>
          <div className="card p-8">
            <ul className="space-y-3 font-inter text-sm text-rhema-dark/70 leading-relaxed">
              <li className="flex gap-3">
                <span className="text-rhema-primary mt-0.5">&#8226;</span>
                Use a versao tema escuro sobre fundos roxos (#3B2366, #4A2C7D) e a versao tema claro sobre fundos brancos (#FFFFFF, #F8F7FC).
              </li>
              <li className="flex gap-3">
                <span className="text-rhema-primary mt-0.5">&#8226;</span>
                Não altere as proporções, cores ou posicionamento dos elementos da logotipo.
              </li>
              <li className="flex gap-3">
                <span className="text-rhema-primary mt-0.5">&#8226;</span>
                Mantenha uma margem de proteção equivalente à altura da letra "rhema" ao redor da marca.
              </li>
              <li className="flex gap-3">
                <span className="text-rhema-primary mt-0.5">&#8226;</span>
                Evite usar sobre fundos de cores que comprometam a legibilidade (amarelo, verde fluorescente, vermelho intenso).
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-rhema-institutional">
        <WaveDivider flip color="var(--color-rhema-institutional)" className="-mb-1" />
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.svg" alt="Rhema Data" width={120} height={39} />
          <p className="font-inter text-xs text-white/50">
            &copy; {new Date().getFullYear()} Rhema Data. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
