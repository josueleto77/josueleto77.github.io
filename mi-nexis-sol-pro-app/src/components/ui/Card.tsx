import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "rounded-3xl bg-white shadow-nexis-card border border-black/5 p-6 sm:p-8",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
