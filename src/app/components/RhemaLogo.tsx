interface RhemaLogoProps {
  variant?: "dark" | "light";
  width?: number;
  className?: string;
}

const ASPECT_RATIO: Record<"dark" | "light", number> = {
  dark: 752.21 / 243.36,
  light: 83.16 / 23.97,
};

const DEFAULT_WIDTH = 140;

export function RhemaLogo({
  variant = "light",
  width,
  className = "",
}: RhemaLogoProps) {
  const src = variant === "dark" ? "/logo-dark.svg" : "/logo-light.svg";
  const resolvedWidth = width ?? DEFAULT_WIDTH;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Rhema Data"
      width={resolvedWidth}
      height={Math.round(resolvedWidth / ASPECT_RATIO[variant])}
      className={className}
    />
  );
}
