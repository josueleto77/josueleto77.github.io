// Service layer for real threads/messages (see supabase/schema.sql).
//
// Not yet wired into AppDataContext: ensureThread() currently returns a
// thread id synchronously (three call sites immediately navigate to
// `/messages?thread=<id>`), while creating a real thread is necessarily
// async. Wiring this up needs those three callers converted to
// await ensureThread(...) first so the id in the URL always matches what
// ends up in state — rather than do that as a drive-by, these functions
// are ready to use once that's done.
import { supabase } from "@/lib/supabase/client";
import type { Message, MessageThread } from "@/lib/types";

interface ThreadRow {
  id: string;
  listing_id: string | null;
  booking_id: string | null;
  swap_id: string | null;
  participant_ids: string[];
  context: "rent" | "switch";
  last_message_at: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string;
  image_url: string | null;
  sent_at: string;
}

interface ThreadReadRow {
  thread_id: string;
  user_id: string;
  last_read_at: string;
}

function mapThread(t: ThreadRow, reads: ThreadReadRow[]): MessageThread {
  const unreadFor = t.participant_ids.filter((uid) => {
    const cursor = reads.find((r) => r.user_id === uid);
    return !cursor || new Date(cursor.last_read_at) < new Date(t.last_message_at);
  });
  return {
    id: t.id,
    listingId: t.listing_id ?? undefined,
    bookingId: t.booking_id ?? undefined,
    swapId: t.swap_id ?? undefined,
    participantIds: t.participant_ids,
    lastMessageAt: t.last_message_at,
    unreadFor,
    context: t.context,
  };
}

function mapMessage(m: MessageRow, reads: ThreadReadRow[]): Message {
  // Approximates per-message read receipts from each participant's
  // last-read cursor rather than storing a readBy[] per message.
  const readBy = reads.filter((r) => new Date(r.last_read_at) >= new Date(m.sent_at)).map((r) => r.user_id);
  return {
    id: m.id,
    threadId: m.thread_id,
    senderId: m.sender_id,
    text: m.text,
    imageUrl: m.image_url ?? undefined,
    sentAt: m.sent_at,
    readBy,
  };
}

/** Threads + messages visible to the signed-in user (RLS-scoped), reassembled into the app's shape. */
export async function fetchMessagingForUser(): Promise<{ threads: MessageThread[]; messages: Message[] }> {
  const [threadsRes, messagesRes, readsRes] = await Promise.all([
    supabase.from("threads").select("*").order("last_message_at", { ascending: false }),
    supabase.from("messages").select("*").order("sent_at", { ascending: true }),
    supabase.from("thread_reads").select("*"),
  ]);
  const threadRows = (threadsRes.data ?? []) as ThreadRow[];
  const messageRows = (messagesRes.data ?? []) as MessageRow[];
  const readRows = (readsRes.data ?? []) as ThreadReadRow[];

  const readsByThread = new Map<string, ThreadReadRow[]>();
  for (const r of readRows) {
    const list = readsByThread.get(r.thread_id) ?? [];
    list.push(r);
    readsByThread.set(r.thread_id, list);
  }

  return {
    threads: threadRows.map((t) => mapThread(t, readsByThread.get(t.id) ?? [])),
    messages: messageRows.map((m) => mapMessage(m, readsByThread.get(m.thread_id) ?? [])),
  };
}

export async function createThreadInSupabase(
  listingId: string | undefined,
  participantIds: string[],
  context: "rent" | "switch"
): Promise<MessageThread | null> {
  const { data, error } = await supabase
    .from("threads")
    .insert({ listing_id: listingId ?? null, participant_ids: participantIds, context })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapThread(data as ThreadRow, []);
}

export async function sendMessageInSupabase(
  threadId: string,
  senderId: string,
  text: string,
  imageUrl?: string
): Promise<Message | null> {
  const sentAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("messages")
    .insert({ thread_id: threadId, sender_id: senderId, text, image_url: imageUrl ?? null, sent_at: sentAt })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  // Best-effort: a failure here just leaves last_message_at stale, not fatal.
  await supabase.from("threads").update({ last_message_at: sentAt }).eq("id", threadId);
  return mapMessage(data as MessageRow, [{ thread_id: threadId, user_id: senderId, last_read_at: sentAt }]);
}

export async function markThreadReadInSupabase(threadId: string, userId: string): Promise<void> {
  await supabase
    .from("thread_reads")
    .upsert({ thread_id: threadId, user_id: userId, last_read_at: new Date().toISOString() });
}
