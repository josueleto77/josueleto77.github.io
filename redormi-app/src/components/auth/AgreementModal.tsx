"use client";

import { useRef, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import { renderMarkdown } from "@/lib/legal/markdown";
import { LEGAL_DOCS } from "@/lib/legal/generated";
import { useAppData } from "@/lib/store/AppDataContext";
import { formatDate } from "@/lib/utils/format";

export default function AgreementModal({
  open,
  onClose,
  onAccept,
  includeSwitchAgreement,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  includeSwitchAgreement: boolean;
}) {
  const { acceptAgreement } = useAppData();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const docs = LEGAL_DOCS.filter((d) => includeSwitchAgreement || d.slug !== "home-exchange-agreement");

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 32) setScrolledToBottom(true);
  }

  function accept() {
    docs.forEach((d) => acceptAgreement(d.slug, d.version));
    onAccept();
  }

  return (
    <Modal open={open} onClose={onClose} title="Review your agreements" size="full">
      <p className="mb-3 text-sm text-ink/60">
        Scroll to the bottom to review everything, then accept to finish creating your account.
        {includeSwitchAgreement && " Because you're joining as a Switch Member, this includes the Home Exchange Agreement."}
      </p>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="scrollbar-thin flex h-[55vh] flex-col gap-10 overflow-y-auto rounded-xl border border-navy/10 bg-cream/40 p-5"
      >
        {docs.map((d) => (
          <article key={d.slug} id={d.slug}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-navy/10 pb-2">
              <h3 className="text-lg font-extrabold text-navy">{d.title}</h3>
              <span className="text-xs text-ink/50">
                v{d.version} · {formatDate(d.effectiveDate)}
              </span>
            </div>
            <div className="flex flex-col gap-3">{renderMarkdown(d.body)}</div>
          </article>
        ))}
        <p className="pb-2 text-center text-xs font-semibold text-sage-dark">— End of agreements —</p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-ink/60">
          {scrolledToBottom ? (
            <>
              <Icon name="check-circle" className="h-4 w-4 text-sage-dark" /> You&apos;ve reviewed all {docs.length} documents.
            </>
          ) : (
            <>
              <Icon name="info" className="h-4 w-4" /> Keep scrolling to enable Accept.
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={accept} disabled={!scrolledToBottom}>
            Accept all & continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
