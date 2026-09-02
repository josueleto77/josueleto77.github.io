import { Suspense } from "react";
import { threads } from "@/lib/data/messages";
import MessagesClient from "../MessagesClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return threads.map((t) => ({ threadId: t.id }));
}

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  return (
    <Suspense fallback={null}>
      <MessagesClient initialThreadId={threadId} />
    </Suspense>
  );
}
