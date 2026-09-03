type LogoProps = {
  className?: string;
  variant?: "dark" | "light";
  withTagline?: boolean;
};

/**
 * Inline SVG wordmark: lowercase "redormi." — the "o" carries a small coral
 * smile arc, the closing period is a coral dot.
 */
export default function Logo({ className = "", variant = "dark", withTagline = false }: LogoProps) {
  const textColor = variant === "dark" ? "#172A3A" : "#F7F4EE";

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <svg
        viewBox="0 0 138 34"
        role="img"
        aria-label="redormi."
        className="h-7 w-auto"
      >
        <text
          x="0"
          y="26"
          fontFamily="Manrope, sans-serif"
          fontWeight={800}
          fontSize="28"
          letterSpacing="-0.5"
          fill={textColor}
        >
          redormi
        </text>
        {/* smile arc nested inside the "o" bowl (measured against the rendered glyph) */}
        <path
          d="M44.5 19.5 Q50.25 24.5 56 19.5"
          stroke="#E97858"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* coral period, raised to sit level with the smile */}
        <circle cx="131" cy="14" r="4.3" fill="#E97858" />
      </svg>
      {withTagline && (
        <span
          className="mt-0.5 text-[11px] font-semibold tracking-wide"
          style={{ color: variant === "dark" ? "#c24b2e" : "#e97858" }}
        >
          Stay. Rest. Redormi.
        </span>
      )}
    </span>
  );
}
