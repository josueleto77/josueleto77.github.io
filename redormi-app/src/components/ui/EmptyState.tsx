import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/ui/icons";

export default function EmptyState({
  icon = "search",
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-navy/15 bg-white/60 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-navy/50">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="text-lg font-bold text-navy">{title}</h3>
      {body && <p className="max-w-sm text-sm text-ink/60">{body}</p>}
      {action}
    </div>
  );
}
