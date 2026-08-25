interface WaveDividerProps {
  flip?: boolean;
  className?: string;
  color?: string;
}

export function WaveDivider({
  flip = false,
  className = "",
  color = "var(--color-rhema-offwhite)",
}: WaveDividerProps) {
  return (
    <div
      className={`w-full overflow-hidden leading-[0] -mb-px ${flip ? "rotate-180" : ""} ${className}`}
    >
      <svg
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto block"
        preserveAspectRatio="none"
      >
        <path
          d="M0 60L48 54C96 48 192 36 288 42C384 48 480 72 576 78C672 84 768 72 864 60C960 48 1056 36 1152 36C1248 36 1344 48 1392 54L1440 60V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V60Z"
          fill={color}
          opacity="0.3"
        />
        <path
          d="M0 80L48 74C96 68 192 56 288 52C384 48 480 52 576 60C672 68 768 80 864 80C960 80 1056 68 1152 56C1248 44 1344 32 1392 26L1440 20V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V80Z"
          fill={color}
          opacity="0.5"
        />
        <path
          d="M0 100L48 96C96 92 192 84 288 80C384 76 480 76 576 80C672 84 768 92 864 96C960 100 1056 100 1152 96C1248 92 1344 84 1392 80L1440 76V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V100Z"
          fill={color}
        />
      </svg>
    </div>
  );
}
