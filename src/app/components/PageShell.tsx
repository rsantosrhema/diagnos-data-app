import type { ReactNode } from "react";
import Link from "next/link";

export function Brand({ width = 152 }: { width?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/rhemadata-logo.png"
      alt="Rhema Data"
      width={width}
      height={Math.round(width / (1483 / 214))}
    />
  );
}

export function Toolbar({ children }: { children?: ReactNode }) {
  return (
    <div className="rd-toolbar-wrap">
      <header className="rd-toolbar">
        <Link href="/" aria-label="Rhema Data">
          <Brand />
        </Link>
        <div className="flex items-center gap-5">{children}</div>
      </header>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="rd-container mt-auto pb-8 pt-16">
      <div className="flex items-center justify-between border-t border-[#1d1d1f1f] pt-6">
        <Brand width={111} />
        <p className="text-xs text-[#707077]">
          &copy; {new Date().getFullYear()} Rhema Data. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

export function PageShell({ children, as: Tag = "main" }: { children: ReactNode; as?: "main" | "div" }) {
  return <Tag className="rd-page">{children}</Tag>;
}

const ICON_PATHS = {
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  layers: "M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5",
  timer: "M12 8v5l3 2M9 2h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01",
  lock: "M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8 11V8a4 4 0 0 1 8 0v3",
  refresh: "M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4",
  play: "M7 4.5v15l12-7.5-12-7.5Z",
  download: "M12 3v12M7 10l5 5 5-5M5 20h14",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
} as const;

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: keyof typeof ICON_PATHS;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
