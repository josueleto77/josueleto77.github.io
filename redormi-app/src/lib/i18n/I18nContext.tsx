"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dictionaries, type Dictionary, type Locale } from "@/lib/i18n/dictionaries";

interface I18nApi {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dict: Dictionary;
}

const I18nContext = createContext<I18nApi | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    // Intentional: always renders "en" first (matching the static export),
    // then swaps to the visitor's saved locale right after mount.
    const stored = window.localStorage.getItem("redormi_locale") as Locale | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored && dictionaries[stored]) setLocale(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("redormi_locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, dict: dictionaries[locale] }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
