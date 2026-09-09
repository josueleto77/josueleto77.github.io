"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/icons";
import Badge from "@/components/ui/Badge";
import RangeSlider from "@/components/ui/RangeSlider";
import Button from "@/components/ui/Button";
import { useAppData } from "@/lib/store/AppDataContext";
import { QUICK_REPLIES } from "@/lib/data/messages";
import { formatDate, formatMoney, isoToday } from "@/lib/utils/format";
import { priceBreakdown, OFFER_DISCOUNT_STEP, OFFER_MAX_DISCOUNT, OFFER_MIN_DISCOUNT } from "@/lib/utils/pricing";
import { listingHref } from "@/lib/utils/listingHref";

export default function ChatWindow({ threadId }: { threadId: string }) {
  const { state, currentUser, sendMessage, markThreadRead, createOffer } = useAppData();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPercent, setOfferPercent] = useState(10);
  const scrollRef = useRef<HTMLDivElement>(null);

  const thread = state.threads.find((t) => t.id === threadId);
  const listing = state.listings.find((l) => l.id === thread?.listingId);
  const otherId = thread?.participantIds.find((p) => p !== currentUser?.id);
  const other = state.users.find((u) => u.id === otherId);
  const msgs = state.messages.filter((m) => m.threadId === threadId).sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1));
  const isConfirmedBooking = state.bookings.some(
    (b) => b.listingId === thread?.listingId && (b.status === "confirmed" || b.status === "completed")
  );

  useEffect(() => {
    if (thread) markThreadRead(thread.id);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    sendMessage(threadId, text.trim() || "📷 Photo", imagePreview ?? undefined);
    setText("");
    setImagePreview(null);
    simulateReply();
  }

  function simulateReply() {
    setTyping(true);
    window.setTimeout(() => setTyping(false), 2200);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
  }

  const canOffer = !!(listing && thread?.context !== "switch" && currentUser && currentUser.id !== listing.hostId);
  const offerNights = listing?.minNights ?? 1;
  const offerBreakdown = listing ? priceBreakdown(listing.pricing, offerNights, offerPercent) : null;

  function sendOffer() {
    if (!listing || !currentUser || !offerBreakdown) return;
    const checkIn = isoToday(3);
    const checkOut = isoToday(3 + offerNights);
    createOffer({
      listingId: listing.id,
      guestId: currentUser.id,
      checkIn,
      checkOut,
      discountPercent: offerPercent,
      resultingNightly: offerBreakdown.nightlyRate,
      resultingTotal: offerBreakdown.total,
    });
    sendMessage(
      threadId,
      `📩 Sent an offer: ${offerPercent}% off — ${formatMoney(offerBreakdown.total)} total for ${offerNights} nights. See it in your offers.`
    );
    setOfferOpen(false);
    setOfferPercent(10);
    simulateReply();
  }

  if (!thread || !other) {
    return <p className="p-6 text-sm text-ink/50">Conversation not found.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-navy/10 px-4 py-3">
        <Avatar src={other.avatar} name={other.name} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-navy">{other.name}</p>
          {listing && (
            <Link href={listingHref(listing.id)} className="truncate text-xs text-ink/50 hover:text-coral">
              {listing.title}
            </Link>
          )}
        </div>
        {thread.context === "switch" && <Badge tone="sage">Switch</Badge>}
      </div>

      {!isConfirmedBooking && (
        <div className="flex items-center gap-1.5 bg-cream px-4 py-1.5 text-[11px] text-ink/50">
          <Icon name="lock" className="h-3 w-3" />
          Phone numbers and emails are masked until a booking or swap is confirmed.
        </div>
      )}

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {msgs.map((m) => {
            const mine = m.senderId === currentUser?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[75%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                  {m.isAutomated && <span className="text-[10px] font-semibold uppercase text-sage-dark">Automated message</span>}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                      mine ? "rounded-br-sm bg-coral text-white" : "rounded-bl-sm bg-white text-navy shadow-sm"
                    }`}
                  >
                    {m.imageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={m.imageUrl} alt="Attachment" className="mb-1.5 max-h-52 rounded-lg object-cover" />
                    )}
                    {m.text}
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-ink/40">
                    {formatDate(m.sentAt, { hour: "numeric", minute: "2-digit" })}
                    {mine && (
                      <Icon
                        name="check-circle"
                        className={`h-3 w-3 ${m.readBy.includes(otherId ?? "") ? "text-sage-dark" : "text-ink/30"}`}
                      />
                    )}
                  </span>
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-ink/40 shadow-sm w-fit">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/40 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/40" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/40 [animation-delay:0.2s]" />
            </div>
          )}
        </div>
      </div>

      {quickOpen && (
        <div className="flex flex-col gap-1 border-t border-navy/10 bg-cream/60 px-4 py-2">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => {
                setText(q);
                setQuickOpen(false);
              }}
              className="rounded-lg px-2 py-1.5 text-left text-xs text-navy hover:bg-white"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {offerOpen && offerBreakdown && (
        <div className="flex flex-col gap-3 border-t border-navy/10 bg-cream/60 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-navy/50">Send an offer</p>
          <RangeSlider
            min={OFFER_MIN_DISCOUNT}
            max={OFFER_MAX_DISCOUNT}
            step={OFFER_DISCOUNT_STEP}
            value={offerPercent}
            onChange={setOfferPercent}
            label="Discount off nightly rate"
            formatValue={(v) => `${v}%`}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/60">
              {formatMoney(offerBreakdown.nightlyRate)} × {offerNights} nights
            </span>
            <span className="font-bold text-coral">{formatMoney(offerBreakdown.total)} total</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOfferOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={sendOffer}>
              Send offer
            </Button>
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="flex items-center gap-2 border-t border-navy/10 px-4 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Attachment preview" className="h-12 w-12 rounded-lg object-cover" />
          <button onClick={() => setImagePreview(null)} className="text-xs font-semibold text-coral">
            Remove
          </button>
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-navy/10 p-3">
        <button
          type="button"
          onClick={() => setQuickOpen((o) => !o)}
          aria-label="Quick replies"
          className="rounded-full p-2 text-navy/50 hover:bg-navy/8"
        >
          <Icon name="sparkles" className="h-[18px] w-[18px]" />
        </button>
        <label className="cursor-pointer rounded-full p-2 text-navy/50 hover:bg-navy/8">
          <Icon name="camera" className="h-[18px] w-[18px]" />
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
        {canOffer && (
          <button
            type="button"
            onClick={() => setOfferOpen((o) => !o)}
            aria-label="Send an offer"
            title="Send an offer"
            className={`rounded-full p-2 hover:bg-navy/8 ${offerOpen ? "text-coral" : "text-navy/50"}`}
          >
            <Icon name="tag" className="h-[18px] w-[18px]" />
          </button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-full border border-navy/15 px-4 py-2 text-sm outline-none focus:border-coral"
        />
        <button type="submit" aria-label="Send" className="rounded-full bg-coral p-2.5 text-white hover:bg-coral-dark">
          <Icon name="send" className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
