"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/lib/store/ToastContext";
import { AppDataProvider } from "@/lib/store/AppDataContext";
import { I18nProvider } from "@/lib/i18n/I18nContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppDataProvider>
        <I18nProvider>{children}</I18nProvider>
      </AppDataProvider>
    </ToastProvider>
  );
}
