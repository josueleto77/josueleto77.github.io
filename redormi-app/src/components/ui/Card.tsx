import type { HTMLAttributes, ReactNode } from "react";

export default function Card({
  children,
  className = "",
  padded = true,
  ...rest
}: { children: ReactNode; padded?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-navy/10 bg-white shadow-sm ${padded ? "p-5" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
