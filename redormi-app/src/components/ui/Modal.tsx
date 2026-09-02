"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  labelledBy?: string;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  full: "max-w-4xl",
};

export default function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none ${SIZE_CLASSES[size]}`}
      >
        {title && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-xl font-extrabold text-navy">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-full p-1.5 text-navy/60 hover:bg-navy/8 hover:text-navy"
            >
              <CloseIcon />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-full p-1.5 text-navy/60 hover:bg-navy/8 hover:text-navy"
          >
            <CloseIcon />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
