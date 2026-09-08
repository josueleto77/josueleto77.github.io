type LogoProps = {
  className?: string;
  variant?: "dark" | "light";
  withTagline?: boolean;
};

/**
 * Inline SVG wordmark: lowercase "redormi." in Fredoka (bold, rounded
 * geometric display face, loaded separately from the Manrope UI font) —
 * the "o" carries a coral smile arc, the closing period is a raised coral
 * dot. Geometry below was measured against the rendered Fredoka glyphs.
 */
export default function Logo({ className = "", variant = "dark", withTagline = false }: LogoProps) {
  const textColor = variant === "dark" ? "#172A3A" : "#F7F4EE";

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <svg
        viewBox="0 0 128 34"
        role="img"
        aria-label="redormi."
        className="h-7 w-auto"
      >
        <text
          x="0"
          y="26"
          fontFamily="var(--font-fredoka), sans-serif"
          fontWeight={700}
          fontSize="28"
          fill={textColor}
        >
          redormi
        </text>
        {/* smile arc nested inside the "o" bowl */}
        <path
          d="M44.5 19 Q49.6 24 54.7 19"
          stroke="#E97858"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* coral period, raised to sit level with the smile */}
        <circle cx="112" cy="12.5" r="4.2" fill="#E97858" />
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
