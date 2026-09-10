"use client";

import { useEffect, useState } from "react";
import type { NexisSolarScoreResult } from "@/types/solar";

const CATEGORY_LABEL: Record<NexisSolarScoreResult["category"], string> = {
  "EXCELLENT SOLAR ROOF": "Excellent Solar Roof",
  "VERY GOOD": "Very Good",
  GOOD: "Good",
  FAIR: "Fair",
  "LIMITED SOLAR POTENTIAL": "Limited Solar Potential",
};

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SolarScoreGauge({ result }: { result: NexisSolarScoreResult }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setProgress(result.score));
    return () => cancelAnimationFrame(raf);
  }, [result.score]);

  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center">
      <p className="font-display text-sm tracking-widest text-nexis-primary">NEXIS SOLAR SCORE</p>
      <div className="relative mt-3 h-52 w-52">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#ffead2" strokeWidth="16" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="#ffa501"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-6xl text-nexis-dark">{result.score}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-nexis-dark/50">/ 100</span>
        </div>
      </div>
      <p className="mt-3 font-display text-lg tracking-wide text-nexis-dark">{CATEGORY_LABEL[result.category]}</p>
      <p className="mt-2 max-w-xs text-center text-xs text-nexis-dark/50">
        Solar Score is an automated preliminary estimate based on available aerial and solar data.
      </p>
    </div>
  );
}
