type LogoProps = {
  className?: string;
  variant?: "dark" | "light";
  withTagline?: boolean;
};

// The official navy-on-transparent artwork provided for the brand.
const LOGO_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-redormi.png`;

/**
 * "dark" (default, navy wordmark) renders the official logo artwork — used
 * on light backgrounds throughout the app (navbar, etc). "light" is a
 * hand-built Fredoka SVG recreation with the wordmark recolored to cream,
 * since the official artwork is navy-only and would be invisible on the
 * navy footer it's used against.
 */
export default function Logo({ className = "", variant = "dark", withTagline = false }: LogoProps) {
  return (
    <span className={`inline-flex flex-col ${className}`}>
      {variant === "dark" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={LOGO_SRC} alt="Redormi" className="h-7 w-auto" />
      ) : (
        <svg viewBox="0 0 128 34" role="img" aria-label="redormi." className="h-7 w-auto">
          <text
            x="0"
            y="26"
            fontFamily="var(--font-fredoka), sans-serif"
            fontWeight={700}
            fontSize="28"
            fill="#F7F4EE"
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
      )}
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
