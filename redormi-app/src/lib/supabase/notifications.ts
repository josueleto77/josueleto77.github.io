import { supabase } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

interface NotificationRow {
  id: string;
  user_id: string;
  type: Notification["type"];
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  created_at: string;
}

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  };
}

/** The signed-in user's own notifications (RLS-scoped). */
export async function fetchNotificationsForUser(): Promise<Notification[]> {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as NotificationRow[]).map(mapNotification);
}

export async function markNotificationReadInSupabase(id: string): Promise<void> {
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}
