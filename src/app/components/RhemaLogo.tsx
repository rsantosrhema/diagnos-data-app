interface RhemaLogoProps {
  variant?: "dark" | "light";
  width?: number;
  className?: string;
}

const SIZES: Record<"dark" | "light", { horizontal: number; vertical: number }> = {
  dark: { horizontal: 140, vertical: 120 },
  light: { horizontal: 140, vertical: 120 },
};

export function RhemaLogo({
  variant = "light",
  width,
  className = "",
}: RhemaLogoProps) {
  const src = variant === "dark" ? "/logo-dark.svg" : "/logo-light.svg";
  const defaultWidth = width ?? SIZES[variant].horizontal;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Rhema Data"
      width={defaultWidth}
      height={Math.round((defaultWidth / (variant === "dark" ? 752 : 83)) * (variant === "dark" ? 243 : 24))}
      className={className}
    />
  );
}
