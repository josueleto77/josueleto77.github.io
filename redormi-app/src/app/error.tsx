"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-coral/10 text-coral">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-xl font-extrabold text-navy">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink/60">An unexpected error occurred while loading this page.</p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
