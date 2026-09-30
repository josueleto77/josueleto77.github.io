type LogoProps = {
  className?: string;
  variant?: "dark" | "light";
  withTagline?: boolean;
};

// The official artwork, in both colorways: "dark" is navy-on-transparent
// (used on light backgrounds, e.g. the navbar) and "light" is the exact
// same artwork with the wordmark recolored to cream (used on dark
// backgrounds, e.g. the navy footer) — both are the same file pixel-for-
// pixel aside from color, so the logo reads identically everywhere.
const LOGO_SRC = {
  dark: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-redormi.png`,
  light: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-redormi-light.png`,
};

export default function Logo({ className = "", variant = "dark", withTagline = false }: LogoProps) {
  return (
    <span className={`inline-flex flex-col ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC[variant]} alt="Redormi" className="h-7 w-auto" />
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
