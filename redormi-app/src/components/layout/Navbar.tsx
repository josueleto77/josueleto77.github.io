"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/logo/Logo";
import Icon from "@/components/ui/icons";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { useAppData } from "@/lib/store/AppDataContext";
import { useI18n } from "@/lib/i18n/I18nContext";

const NAV_LINKS = [
  { href: "/search", key: "rent" as const },
  { href: "/switch", key: "switch" as const },
  { href: "/hot-places", key: "hotPlaces" as const },
  { href: "/special-offers", key: "specialOffers" as const },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { currentUser, isLoggedIn, logout, state } = useAppData();
  const { dict, locale, setLocale } = useI18n();

  const unread = currentUser
    ? state.threads.filter((t) => t.unreadFor.includes(currentUser.id)).length
    : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-cream/90 backdrop-blur">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Redormi home" className="shrink-0">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  pathname === link.href ? "bg-navy text-cream" : "text-navy hover:bg-navy/8"
                }`}
              >
                {dict.nav[link.key]}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/host/new"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-navy hover:bg-navy/8"
          >
            {dict.nav.listYourHome}
          </Link>
          {isLoggedIn && (
            <Link href="/messages" className="relative rounded-lg p-2.5 text-navy hover:bg-navy/8" aria-label="Messages">
              <Icon name="message" className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={() => setLocale(locale === "en" ? "es" : "en")}
            className="rounded-lg px-2.5 py-2 text-xs font-bold text-navy/60 hover:bg-navy/8"
            aria-label="Change language"
          >
            {locale.toUpperCase()}
          </button>

          {isLoggedIn && currentUser ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-navy/15 py-1 pl-1 pr-3 hover:bg-navy/5"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar src={currentUser.avatar} name={currentUser.name} size={30} />
                <Icon name="chevron-down" className="h-3.5 w-3.5 text-navy" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-navy/10 bg-white p-1.5 shadow-xl"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <MenuLink href="/dashboard/guest" label="Guest dashboard" onClick={() => setMenuOpen(false)} />
                  <MenuLink href="/dashboard/host" label="Host dashboard" onClick={() => setMenuOpen(false)} />
                  <MenuLink href="/account" label={dict.nav.account} onClick={() => setMenuOpen(false)} />
                  <MenuLink href="/switch" label="Redormi Switch" onClick={() => setMenuOpen(false)} />
                  <hr className="my-1 border-navy/10" />
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-coral-dark hover:bg-coral/10"
                  >
                    <Icon name="logout" className="h-4 w-4" />
                    {dict.nav.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button href="/login" variant="ghost" size="sm">
                {dict.nav.login}
              </Button>
              <Button href="/signup" variant="primary" size="sm">
                {dict.nav.signup}
              </Button>
            </div>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-navy lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <Icon name={open ? "x" : "menu"} className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <nav className="border-t border-navy/10 bg-cream px-4 py-3 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-navy/8"
              >
                {dict.nav[link.key]}
              </Link>
            ))}
            <Link href="/host/new" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-navy/8">
              {dict.nav.listYourHome}
            </Link>
            {isLoggedIn ? (
              <>
                <Link href="/messages" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-navy/8">
                  {dict.nav.messages} {unread > 0 && <span className="ml-1 rounded-full bg-coral px-1.5 text-xs text-white">{unread}</span>}
                </Link>
                <Link href="/dashboard/guest" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-navy/8">
                  Guest dashboard
                </Link>
                <Link href="/dashboard/host" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-navy/8">
                  Host dashboard
                </Link>
                <Link href="/account" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-navy/8">
                  {dict.nav.account}
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-coral-dark hover:bg-coral/10"
                >
                  {dict.nav.logout}
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Button href="/login" variant="outline" size="sm" className="flex-1">
                  {dict.nav.login}
                </Button>
                <Button href="/signup" variant="primary" size="sm" className="flex-1">
                  {dict.nav.signup}
                </Button>
              </div>
            )}
            <button
              onClick={() => setLocale(locale === "en" ? "es" : "en")}
              className="mt-2 self-start rounded-lg px-3 py-2 text-xs font-bold text-navy/60 hover:bg-navy/8"
            >
              {locale === "en" ? "Español" : "English"}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}

function MenuLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} role="menuitem" className="block rounded-lg px-3 py-2 text-sm font-semibold text-navy hover:bg-navy/8">
      {label}
    </Link>
  );
}
