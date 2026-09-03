import Link from "next/link";
import type { User } from "@/lib/types";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/format";

export default function HostCard({ host }: { host: User }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-navy/10 bg-white p-5">
      <Avatar src={host.avatar} name={host.name} size={56} />
      <div className="flex-1">
        <p className="text-sm font-bold text-navy">Hosted by {host.name}</p>
        <p className="text-xs text-ink/60">Member since {formatDate(host.memberSince)}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/60">
          {host.verification.identity === "verified" && (
            <span className="flex items-center gap-1 text-sage-dark">
              <Icon name="shield-check" className="h-3.5 w-3.5" /> Identity verified
            </span>
          )}
          {host.responseRate && (
            <span>
              {host.responseRate}% response rate
            </span>
          )}
          {host.responseTimeMins && <span>Responds within {host.responseTimeMins < 60 ? `${host.responseTimeMins}m` : `${Math.round(host.responseTimeMins / 60)}h`}</span>}
        </div>
      </div>
      <Link
        href="/messages"
        className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-navy/15 px-3.5 py-2 text-xs font-bold text-navy hover:bg-navy/5 sm:flex"
      >
        <Icon name="message" className="h-3.5 w-3.5" />
        Message
      </Link>
    </div>
  );
}
