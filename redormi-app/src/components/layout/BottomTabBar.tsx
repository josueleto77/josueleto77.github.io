"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/icons";
import type { IconName } from "@/components/ui/icons";
import { useAppData } from "@/lib/store/AppDataContext";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Tab {
  href: string;
  icon: IconName;
  label: string;
  isActive: (pathname: string) => boolean;
  badge?: number;
}

/**
 * App-style primary navigation for small screens (native app + mobile web),
 * replacing the need to open the hamburger menu for the things people reach
 * for most. Hidden at the lg breakpoint, where Navbar's inline nav takes over.
 */
export default function BottomTabBar() {
  const pathname = usePathname();
  const { currentUser, isLoggedIn, state } = useAppData();
  const { dict } = useI18n();

  const unread = currentUser ? state.threads.filter((t) => t.unreadFor.includes(currentUser.id)).length : 0;

  const tabs: Tab[] = [
    {
      href: "/search",
      icon: "search",
      label: dict.nav.explore,
      isActive: (p) => p === "/search" || p.startsWith("/listing"),
    },
    {
      href: "/switch",
      icon: "handshake",
      label: dict.nav.switch,
      isActive: (p) => p.startsWith("/switch"),
    },
    {
      href: isLoggedIn ? "/dashboard/guest" : "/login",
      icon: "bed",
      label: dict.nav.trips,
      isActive: (p) => p.startsWith("/dashboard"),
    },
    {
      href: isLoggedIn ? "/messages" : "/login",
      icon: "message",
      label: dict.nav.messages,
      isActive: (p) => p.startsWith("/messages"),
      badge: unread,
    },
    {
      href: isLoggedIn ? "/account" : "/login",
      icon: "user",
      label: dict.nav.profile,
      isActive: (p) => p.startsWith("/account") || p === "/login" || p === "/signup",
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-cream/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-xl items-stretch justify-between px-1">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname ?? "");
          return (
            <Link
              key={tab.href + tab.label}
              href={tab.href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold"
              aria-current={active ? "page" : undefined}
            >
              <span className={`relative flex items-center justify-center ${active ? "text-coral" : "text-navy/50"}`}>
                <Icon name={tab.icon} className="h-6 w-6" />
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className={active ? "text-coral" : "text-navy/50"}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
