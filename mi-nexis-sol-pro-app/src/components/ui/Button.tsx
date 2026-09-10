import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "dark" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "nexis-gradient-primary text-nexis-dark shadow-nexis-card hover:brightness-105 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed",
  dark: "bg-nexis-dark text-white hover:bg-[#243139] active:bg-[#1c2932] disabled:opacity-60",
  outline: "border-2 border-nexis-dark text-nexis-dark bg-transparent hover:bg-nexis-dark hover:text-white",
  ghost: "bg-transparent text-nexis-dark hover:bg-nexis-accent/60",
};

export function Button({ variant = "primary", fullWidth, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={[
        "font-display text-base sm:text-lg tracking-wide uppercase rounded-2xl px-6 py-4 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nexis-primary/40",
        fullWidth ? "w-full" : "",
        VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
