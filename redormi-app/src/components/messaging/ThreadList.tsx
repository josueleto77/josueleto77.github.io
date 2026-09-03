"use client";

import type { MessageThread } from "@/lib/types";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { useAppData } from "@/lib/store/AppDataContext";
import { relativeTime } from "@/lib/utils/format";
import { useMounted } from "@/lib/utils/useClientOnly";

export default function ThreadList({
  threads,
  activeId,
  onSelect,
}: {
  threads: MessageThread[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const { state, currentUser } = useAppData();
  // "Xh ago" depends on the current time, which differs between this
  // statically-prerendered HTML and the visitor's browser — so it's only
  // computed after mount, to avoid a hydration mismatch.
  const mounted = useMounted();

  if (threads.length === 0) {
    return <p className="p-4 text-sm text-ink/50">No conversations yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-navy/8">
      {threads.map((t) => {
        const otherId = t.participantIds.find((p) => p !== currentUser?.id);
        const other = state.users.find((u) => u.id === otherId);
        const listing = state.listings.find((l) => l.id === t.listingId);
        const lastMsg = [...state.messages].filter((m) => m.threadId === t.id).sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0];
        const unread = currentUser ? t.unreadFor.includes(currentUser.id) : false;

        return (
          <li key={t.id}>
            <button
              onClick={() => onSelect(t.id)}
              className={`flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-navy/5 ${activeId === t.id ? "bg-navy/8" : ""}`}
            >
              <Avatar src={other?.avatar} name={other?.name ?? "?"} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${unread ? "font-extrabold text-navy" : "font-semibold text-navy/90"}`}>{other?.name}</p>
                  <span className="shrink-0 text-[11px] text-ink/40">{mounted ? relativeTime(t.lastMessageAt) : ""}</span>
                </div>
                {listing && <p className="truncate text-xs text-ink/50">{listing.title}</p>}
                <div className="mt-0.5 flex items-center gap-1.5">
                  {t.context === "switch" && <Badge tone="sage" className="text-[10px]">Switch</Badge>}
                  <p className={`truncate text-xs ${unread ? "font-semibold text-navy" : "text-ink/60"}`}>
                    {lastMsg?.text ?? "No messages yet"}
                  </p>
                </div>
              </div>
              {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
