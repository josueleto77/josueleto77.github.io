"use client";

import Icon, { type IconName } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/I18nContext";

const ITEMS: { key: "curated" | "secure" | "authentic" | "support"; icon: IconName }[] = [
  { key: "curated", icon: "layers" },
  { key: "secure", icon: "shield-check" },
  { key: "authentic", icon: "sparkles" },
  { key: "support", icon: "clock" },
];

export default function TrustBar({ className = "" }: { className?: string }) {
  const { dict } = useI18n();
  return (
    <div className={`border-y border-navy/10 bg-white/60 ${className}`}>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:grid-cols-4 sm:px-6">
        {ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral">
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="text-sm font-semibold text-navy">{dict.trustBar[item.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
