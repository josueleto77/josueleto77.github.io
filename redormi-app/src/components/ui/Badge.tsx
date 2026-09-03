import type { ReactNode } from "react";

type Tone = "coral" | "sage" | "navy" | "cream" | "outline";

const TONE_CLASSES: Record<Tone, string> = {
  coral: "bg-coral text-white",
  sage: "bg-sage text-navy",
  navy: "bg-navy text-cream",
  cream: "bg-cream text-navy border border-navy/15",
  outline: "bg-transparent text-navy border border-navy/25",
};

export default function Badge({
  children,
  tone = "cream",
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${TONE_CLASSES[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
