"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-3xl text-nexis-dark">Something Went Wrong</h1>
      <p className="mt-3 text-sm text-nexis-dark/60">
        We hit an unexpected error. Your information is safe — please try again, or reach out to a Nexis
        Power solar expert.
      </p>
      <div className="mt-6 w-full max-w-xs">
        <Button onClick={reset} fullWidth>
          Try Again
        </Button>
      </div>
    </div>
  );
}
