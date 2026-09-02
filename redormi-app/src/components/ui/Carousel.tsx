"use client";

import { useRef } from "react";
import Icon from "@/components/ui/icons";

export default function Carousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div ref={ref} className="scrollbar-thin flex gap-4 overflow-x-auto scroll-smooth pb-2">
        {children}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Scroll left"
        className="absolute -left-3 top-1/3 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-navy/10 bg-white shadow-md hover:scale-105 lg:flex"
      >
        <Icon name="chevron-left" className="h-4 w-4 text-navy" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Scroll right"
        className="absolute -right-3 top-1/3 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-navy/10 bg-white shadow-md hover:scale-105 lg:flex"
      >
        <Icon name="chevron-right" className="h-4 w-4 text-navy" />
      </button>
    </div>
  );
}
