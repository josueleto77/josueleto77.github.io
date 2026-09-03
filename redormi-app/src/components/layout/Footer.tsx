"use client";

import Link from "next/link";
import Logo from "@/components/logo/Logo";
import { useI18n } from "@/lib/i18n/I18nContext";

const COLUMNS: { titleKey: "company" | "support" | "legal"; links: { label: string; href: string }[] }[] = [
  {
    titleKey: "company",
    links: [
      { label: "How Redormi works", href: "/switch" },
      { label: "Hot Places", href: "/hot-places" },
      { label: "Special Offers", href: "/special-offers" },
      { label: "List your home", href: "/host/new" },
    ],
  },
  {
    titleKey: "support",
    links: [
      { label: "Messages", href: "/messages" },
      { label: "Account", href: "/account" },
      { label: "Guest dashboard", href: "/dashboard/guest" },
      { label: "Host dashboard", href: "/dashboard/host" },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { label: "Terms & policies", href: "/legal/terms" },
      { label: "Home Exchange Agreement", href: "/legal/switch-agreement" },
    ],
  },
];

export default function Footer() {
  const { dict, locale, setLocale } = useI18n();
  return (
    <footer className="border-t border-navy/10 bg-navy text-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo variant="light" withTagline />
            <p className="mt-4 max-w-xs text-sm text-cream/60">
              A travel marketplace for renting the classic way, or swapping homes with Redormi Switch.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.titleKey}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-cream/50">{dict.footer[col.titleKey]}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-cream/80 hover:text-coral">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-cream/10 pt-6 sm:flex-row">
          <p className="text-xs text-cream/50">© {new Date().getFullYear()} Redormi. {dict.footer.rights}</p>
          <button
            onClick={() => setLocale(locale === "en" ? "es" : "en")}
            className="rounded-lg border border-cream/20 px-3 py-1.5 text-xs font-semibold text-cream/80 hover:bg-cream/10"
          >
            {dict.footer.language}: {locale === "en" ? "English" : "Español"}
          </button>
        </div>
      </div>
    </footer>
  );
}
