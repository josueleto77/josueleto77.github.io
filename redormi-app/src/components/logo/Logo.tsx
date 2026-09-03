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
        {/* smile arc riding inside the "o" (approx. position after "red") */}
        <path
          d="M50 20a6 6 0 0 0 8.6 1.8"
          stroke="#E97858"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        {/* coral period */}
        <circle cx="131" cy="27" r="3.4" fill="#E97858" />
      </svg>
      {withTagline && (
        <span
          className="mt-0.5 text-[11px] font-semibold tracking-wide"
          style={{ color: variant === "dark" ? "#7f9078" : "#A8B5A2" }}
        >
          Stay. Rest. Redormi.
        </span>
      )}
    </span>
  );
}
