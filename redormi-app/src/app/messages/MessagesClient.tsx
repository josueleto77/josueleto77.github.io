"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import ThreadList from "@/components/messaging/ThreadList";
import ChatWindow from "@/components/messaging/ChatWindow";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/icons";
import { useAppData } from "@/lib/store/AppDataContext";

export default function MessagesClient({ initialThreadId }: { initialThreadId?: string }) {
  const params = useSearchParams();
  const { state, currentUser } = useAppData();
  const [activeId, setActiveId] = useState<string | undefined>(initialThreadId ?? params.get("thread") ?? undefined);

  const myThreads = currentUser
    ? state.threads
        .filter((t) => t.participantIds.includes(currentUser.id))
        .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1))
    : [];

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-lg font-bold text-navy">Log in to see your messages</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl">
      <div className={`w-full shrink-0 border-r border-navy/10 sm:w-80 ${activeId ? "hidden sm:block" : ""}`}>
        <div className="flex items-center gap-2 border-b border-navy/10 px-4 py-3.5">
          <Icon name="message" className="h-4 w-4 text-navy/50" />
          <h1 className="text-sm font-extrabold text-navy">Messages</h1>
        </div>
        <div className="scrollbar-thin h-[calc(100%-52px)] overflow-y-auto">
          <ThreadList threads={myThreads} activeId={activeId} onSelect={setActiveId} />
        </div>
      </div>

      <div className={`flex-1 ${activeId ? "" : "hidden sm:block"}`}>
        {activeId ? (
          <div className="flex h-full flex-col">
            <button onClick={() => setActiveId(undefined)} className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-navy/60 sm:hidden">
              <Icon name="chevron-left" className="h-3.5 w-3.5" />
              Back to inbox
            </button>
            <div className="min-h-0 flex-1">
              <ChatWindow threadId={activeId} />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <EmptyState icon="message" title="Select a conversation" body="Choose a thread from the list to see your messages." />
          </div>
        )}
      </div>
    </div>
  );
}
