"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Locating your property",
  "Analyzing roof surfaces",
  "Measuring solar exposure",
  "Calculating system size",
  "Designing your solar array",
  "Preparing your results",
];

const STEP_INTERVAL_MS = 1400;

/**
 * The animated "engineering assessment in progress" sequence shown while
 * `/api/solar/analyze` runs server-side. Steps advance on a timer purely for
 * pacing/feel — the actual API call this masks can finish faster or slower;
 * the last step simply holds until the response (and route redirect) lands.
 */
export function AnalyzingSequence() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep >= STEPS.length - 1) return;
    const timer = setTimeout(() => setActiveStep((s) => s + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [activeStep]);

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full nexis-gradient-primary animate-nexis-pulse">
        <svg viewBox="0 0 24 24" className="h-10 w-10 text-nexis-dark" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="font-display text-2xl text-nexis-dark sm:text-3xl">Analyzing Your Home&hellip;</h2>

      <ul className="mt-6 w-full max-w-sm space-y-3 text-left">
        {STEPS.map((step, index) => {
          const done = index < activeStep;
          const current = index === activeStep;
          return (
            <li key={step} className="flex items-center gap-3 transition-opacity duration-300" style={{ opacity: index <= activeStep ? 1 : 0.35 }}>
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done ? "bg-nexis-primary text-nexis-dark" : current ? "border-2 border-nexis-primary text-nexis-primary" : "border-2 border-nexis-dark/20 text-transparent",
                ].join(" ")}
              >
                {done ? "✓" : ""}
              </span>
              <span className={["text-sm font-medium", done || current ? "text-nexis-dark" : "text-nexis-dark/40"].join(" ")}>
                {step}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
