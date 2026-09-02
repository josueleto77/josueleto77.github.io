import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "switch" | "outline" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-coral text-white hover:bg-coral-dark disabled:bg-coral/50",
  switch: "bg-sage text-navy hover:bg-sage-dark hover:text-white disabled:bg-sage/50",
  outline: "border-2 border-navy text-navy hover:bg-navy hover:text-cream disabled:opacity-50",
  ghost: "text-navy hover:bg-navy/8 disabled:opacity-50",
  dark: "bg-navy text-cream hover:bg-navy/90 disabled:bg-navy/50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-7 py-3.5 text-base rounded-xl gap-2",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkButtonProps = CommonProps & { href: string; target?: string; rel?: string };

function classes(variant: Variant, size: Size, fullWidth: boolean | undefined, className: string | undefined) {
  return [
    "inline-flex items-center justify-center font-semibold transition-colors cursor-pointer whitespace-nowrap",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  icon,
  className,
  children,
  href,
  ...rest
}: (ButtonProps | LinkButtonProps) & { href?: string }) {
  if (href) {
    const { target, rel } = rest as LinkButtonProps;
    return (
      <Link href={href} target={target} rel={rel} className={classes(variant, size, fullWidth, className)}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button className={classes(variant, size, fullWidth, className)} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {icon}
      {children}
    </button>
  );
}
