"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  text: string;
}

interface ToastApi {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { ...toast, id }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-1/2 z-[200] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-fade-in pointer-events-auto rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
              t.tone === "success"
                ? "border-sage-dark/30 bg-sage text-navy"
                : t.tone === "error"
                  ? "border-coral-dark/30 bg-coral text-white"
                  : "border-navy/10 bg-navy text-cream"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi | null {
  return useContext(ToastContext);
}
