"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/icons";
import { SUPPORT_FAQS, type SupportFaq } from "@/lib/data/supportBot";
import { matchFaq } from "@/lib/utils/supportBotMatch";

interface BotMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  linkLabel?: string;
  linkHref?: string;
}

const QUICK_TOPIC_IDS = ["what-is-redormi", "how-switch-works", "how-offers-work", "cancellation-policy", "vehicle-rental", "list-a-home"];
const QUICK_TOPICS = QUICK_TOPIC_IDS.map((id) => SUPPORT_FAQS.find((f) => f.id === id)!).filter(Boolean);

const GREETING: BotMessage = {
  id: "greeting",
  role: "bot",
  text:
    "Hi! I'm the Redormi support bot. I can answer questions about how Rent and Switch work, our services, and our policies. Pick a topic below or just type your question.",
};

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `msg_${idCounter}`;
}

function toBotMessage(faq: SupportFaq): BotMessage {
  return { id: nextId(), role: "bot", text: faq.answer, linkLabel: faq.linkLabel, linkHref: faq.linkHref };
}

export default function SupportBotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<BotMessage[]>([GREETING]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  function respond(query: string) {
    const faq = matchFaq(query);
    setThinking(true);
    window.setTimeout(() => {
      setThinking(false);
      setMessages((m) => [
        ...m,
        faq
          ? toBotMessage(faq)
          : {
              id: nextId(),
              role: "bot",
              text:
                "I don't have a published answer for that yet. For anything account-specific or outside our business, services, and policies, our team can help directly.",
              linkLabel: "Message support",
              linkHref: "/messages",
            },
      ]);
    }, 500);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { id: nextId(), role: "user", text: q }]);
    setText("");
    respond(q);
  }

  function askQuick(faq: SupportFaq) {
    setMessages((m) => [...m, { id: nextId(), role: "user", text: faq.question }]);
    respond(faq.question);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-navy/10 bg-navy px-4 py-3">
            <div>
              <p className="text-sm font-bold text-cream">Redormi Support</p>
              <p className="text-[11px] text-cream/60">Automated answers from our policies</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
              className="rounded-full p-1.5 text-cream/70 hover:bg-white/10 hover:text-cream"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[85%] flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                        m.role === "user" ? "rounded-br-sm bg-coral text-white" : "rounded-bl-sm bg-cream text-navy"
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.linkHref && m.linkLabel && (
                      <Link
                        href={m.linkHref}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1 rounded-full border border-navy/15 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
                      >
                        {m.linkLabel}
                        <Icon name="arrow-right" className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-cream px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/40 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/40" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/40 [animation-delay:0.2s]" />
                </div>
              )}
              {messages.length === 1 && (
                <div className="mt-1 flex flex-col gap-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-navy/40">Popular topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TOPICS.map((faq) => (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() => askQuick(faq)}
                        className="rounded-full border border-navy/15 px-3 py-1.5 text-left text-xs font-semibold text-navy hover:border-coral hover:text-coral"
                      >
                        {faq.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-navy/10 p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about Rent, Switch, or our policies…"
              className="flex-1 rounded-full border border-navy/15 px-4 py-2 text-sm outline-none focus:border-coral"
            />
            <button
              type="submit"
              aria-label="Send"
              className="rounded-full bg-coral p-2.5 text-white hover:bg-coral-dark"
            >
              <Icon name="send" className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-coral text-white shadow-lg transition-transform hover:scale-105 hover:bg-coral-dark"
      >
        <Icon name={open ? "x" : "message"} className="h-6 w-6" />
      </button>
    </div>
  );
}
