"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/icons";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import TierBreakdownCard from "@/components/switch/TierBreakdownCard";
import ExtraServiceCard from "@/components/services/ExtraServiceCard";
import { useAppData } from "@/lib/store/AppDataContext";
import { computeSwitchTier, tierGap as computeTierGap } from "@/lib/utils/tier";
import { formatDateShort, formatMoney, isoToday, nightsBetween } from "@/lib/utils/format";
import { switchProcessingFee } from "@/lib/utils/pricing";
import { swapAddOns } from "@/lib/data/switch";

const CHECKLIST_ITEMS = [
  "Keys / access instructions shared",
  "House manual sent",
  "Emergency contacts exchanged",
  "Check-in / check-out times confirmed",
  "Pet & cleaning terms agreed",
];

export default function SwapMatchClient({ targetListingId }: { targetListingId: string }) {
  const router = useRouter();
  const { state, currentUser, createSwap, respondSwap, signAgreement } = useAppData();
  const target = state.listings.find((l) => l.id === targetListingId);
  const targetHost = state.users.find((u) => u.id === target?.hostId);

  const myListings = useMemo(
    () => (currentUser ? state.listings.filter((l) => l.hostId === currentUser.id && l.switch.enabled) : []),
    [currentUser, state.listings]
  );
  const [myListingId, setMyListingId] = useState(myListings[0]?.id ?? "");
  const myListing = state.listings.find((l) => l.id === myListingId);

  const [start, setStart] = useState(target?.switch.travelDatesStart ?? isoToday(30));
  const [end, setEnd] = useState(target?.switch.travelDatesEnd ?? isoToday(44));
  const [message, setMessage] = useState("");
  const [checklist, setChecklist] = useState<boolean[]>(CHECKLIST_ITEMS.map(() => false));
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const existingSwap = useMemo(() => {
    if (!currentUser || !target) return undefined;
    return state.swaps.find(
      (s) =>
        (s.toListingId === target.id && myListings.some((l) => l.id === s.fromListingId)) ||
        (s.fromListingId === target.id && myListings.some((l) => l.id === s.toListingId))
    );
  }, [state.swaps, currentUser, target, myListings]);

  if (!target || !targetHost) return notFound();

  const targetScore = computeSwitchTier(target, targetHost);
  const myScore = myListing ? computeSwitchTier(myListing, currentUser) : null;
  const gap = myScore ? computeTierGap(myScore, targetScore) : 0;

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-lg font-bold text-navy">Log in to propose a swap</p>
        <Button href="/login" className="mt-4">
          Log in
        </Button>
      </div>
    );
  }

  if (target.hostId === currentUser.id) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-lg font-bold text-navy">This is your own listing</p>
        <p className="mt-2 text-sm text-ink/60">Browse other Switch homes to propose an exchange.</p>
        <Button href="/switch#browse" className="mt-4">
          Browse Switch homes
        </Button>
      </div>
    );
  }

  function submitProposal() {
    if (!myListing || !currentUser || !target) return;
    createSwap({
      fromListingId: myListing.id,
      fromOwnerId: currentUser.id,
      toListingId: target.id,
      toOwnerId: target.hostId,
      proposedStart: start,
      proposedEnd: end,
      message,
      tierGap: gap,
      processingFeePerOwner: switchProcessingFee(nightsBetween(start, end)),
    });
  }

  const agreement = existingSwap ? state.agreements.find((a) => a.swapId === existingSwap.id) : undefined;
  const iAmFrom = existingSwap?.fromOwnerId === currentUser.id;
  const mySigned = iAmFrom ? agreement?.signedByFrom : agreement?.signedByTo;
  const theirSigned = iAmFrom ? agreement?.signedByTo : agreement?.signedByFrom;
  const swapListing = existingSwap ? state.listings.find((l) => l.id === (iAmFrom ? existingSwap.toListingId : existingSwap.fromListingId)) : undefined;
  const mySwapListing = existingSwap ? state.listings.find((l) => l.id === (iAmFrom ? existingSwap.fromListingId : existingSwap.toListingId)) : undefined;
  const bothServices = state.extraServices.filter(
    (s) => s.listingId === swapListing?.id || s.listingId === mySwapListing?.id
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2 text-sm text-ink/60">
        <Link href="/switch" className="hover:text-navy">
          Redormi Switch
        </Link>
        <Icon name="chevron-right" className="h-3.5 w-3.5" />
        <span className="text-navy">{target.title}</span>
      </div>

      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-navy/10 bg-white p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={target.photos[0]?.url} alt={target.title} className="h-20 w-24 rounded-xl object-cover" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-sage-dark">Proposing a swap for</p>
          <h1 className="text-lg font-extrabold text-navy">{target.title}</h1>
          <p className="text-sm text-ink/60">
            {target.city}, {target.country} · Hosted by {targetHost.name}
          </p>
        </div>
        <Badge tone="sage" className="ml-auto">
          {targetScore.label}
        </Badge>
      </div>

      {!existingSwap ? (
        myListings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy/20 bg-white p-8 text-center">
            <Icon name="sparkles" className="mx-auto h-6 w-6 text-sage-dark" />
            <p className="mt-2 font-bold text-navy">Enable Switch on one of your homes first</p>
            <p className="mt-1 text-sm text-ink/60">You&apos;ll need a Switch-enabled listing to propose an exchange.</p>
            <Button href="/host/new" variant="switch" className="mt-4">
              List / enable Switch
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy">Offer one of your homes</label>
              <select
                value={myListingId}
                onChange={(e) => setMyListingId(e.target.value)}
                className="w-full rounded-xl border border-navy/15 px-3.5 py-2.5 text-sm"
              >
                {myListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>

            {myScore && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TierBreakdownCard score={myScore} compact />
                <TierBreakdownCard score={targetScore} compact />
              </div>
            )}

            {gap > 0.5 && (
              <div className="flex items-start gap-2 rounded-xl bg-coral/10 p-4 text-sm text-coral-dark">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  There&apos;s a tier gap of {gap.toFixed(1)}. You can offset it with extra services or a small
                  balancing payment once the swap is accepted.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-navy">Start date</span>
                <input type="date" value={start} min={isoToday()} onChange={(e) => setStart(e.target.value)} className="rounded-xl border border-navy/15 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-navy">End date</span>
                <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="rounded-xl border border-navy/15 px-3 py-2" />
              </label>
            </div>

            <Textarea label="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell them why this swap would be a great fit." />

            <Button onClick={submitProposal} size="lg" variant="switch">
              Send swap proposal
            </Button>
          </div>
        )
      ) : (
        <SwapStatusPanel
          status={existingSwap.status}
          iAmFrom={iAmFrom}
          gap={existingSwap.tierGap}
          fee={existingSwap.processingFeePerOwner}
          start={existingSwap.proposedStart}
          end={existingSwap.proposedEnd}
          message={existingSwap.message}
          onAccept={() => respondSwap(existingSwap.id, "accepted")}
          onDecline={() => respondSwap(existingSwap.id, "declined")}
        />
      )}

      {existingSwap && (existingSwap.status === "accepted" || existingSwap.status === "agreement_pending" || existingSwap.status === "confirmed") && (
        <div className="mt-8 flex flex-col gap-6">
          <div>
            <h2 className="mb-3 text-lg font-extrabold text-navy">Add-ons</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {swapAddOns.map((addon) => (
                <label key={addon.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-navy/10 bg-white p-4">
                  <input
                    type="checkbox"
                    checked={selectedAddOns.includes(addon.id)}
                    onChange={() =>
                      setSelectedAddOns((prev) =>
                        prev.includes(addon.id) ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
                      )
                    }
                    className="mt-1 h-4 w-4 accent-sage-dark"
                  />
                  <span>
                    <span className="block text-sm font-bold text-navy">
                      {addon.label} · {formatMoney(addon.price)}
                    </span>
                    <span className="block text-xs text-ink/60">{addon.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-cream p-4 text-sm">
            <div className="flex justify-between">
              <span>Swap</span>
              <span className="font-semibold">$0 rent</span>
            </div>
            <div className="flex justify-between">
              <span>Processing fee</span>
              <span className="font-semibold">{formatMoney(existingSwap.processingFeePerOwner)}</span>
            </div>
            <div className="flex justify-between">
              <span>Add-ons</span>
              <span className="font-semibold">
                {formatMoney(selectedAddOns.reduce((sum, id) => sum + (swapAddOns.find((a) => a.id === id)?.price ?? 0), 0))}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-navy/10 pt-2 text-base font-bold text-navy">
              <span>Total</span>
              <span>
                {formatMoney(
                  existingSwap.processingFeePerOwner +
                    selectedAddOns.reduce((sum, id) => sum + (swapAddOns.find((a) => a.id === id)?.price ?? 0), 0)
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-navy/10 bg-white p-4">
            <div className="text-sm">
              <p className="font-semibold text-navy">Home Exchange Agreement</p>
              <p className="text-ink/60">
                You: {mySigned ? "Signed ✓" : "Not signed"} · Other party: {theirSigned ? "Signed ✓" : "Not signed"}
              </p>
            </div>
            <Button
              disabled={!!mySigned}
              onClick={() => signAgreement(existingSwap.id, iAmFrom ? "from" : "to", selectedAddOns)}
              variant="switch"
            >
              {mySigned ? "Signed" : "Sign agreement"}
            </Button>
          </div>

          {existingSwap.status === "confirmed" && (
            <>
              <div>
                <h2 className="mb-3 text-lg font-extrabold text-navy">Pre-arrival checklist</h2>
                <div className="flex flex-col gap-2 rounded-2xl border border-navy/10 bg-white p-4">
                  {CHECKLIST_ITEMS.map((item, i) => (
                    <label key={item} className="flex items-center gap-2 text-sm text-navy">
                      <input
                        type="checkbox"
                        checked={checklist[i]}
                        onChange={() =>
                          setChecklist((c) => c.map((v, idx) => (idx === i ? !v : v)))
                        }
                        className="h-4 w-4 accent-sage-dark"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              {bothServices.length > 0 && (
                <div>
                  <h2 className="mb-3 text-lg font-extrabold text-navy">Extra services for your swap</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {bothServices.map((s) => (
                      <ExtraServiceCard key={s.id} service={s} swapId={existingSwap.id} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        onClick={() => router.push("/dashboard/host?tab=swaps")}
        className="mt-8 text-sm font-semibold text-navy hover:text-coral"
      >
        View all swap requests →
      </button>
    </div>
  );
}

function SwapStatusPanel({
  status,
  iAmFrom,
  gap,
  fee,
  start,
  end,
  message,
  onAccept,
  onDecline,
}: {
  status: string;
  iAmFrom: boolean;
  gap: number;
  fee: number;
  start: string;
  end: string;
  message?: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const waitingOnMe = (status === "proposed" || status === "countered") && !iAmFrom;

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <Badge tone={status === "declined" ? "navy" : status === "confirmed" ? "sage" : "coral"} className="capitalize">
          {status.replace("_", " ")}
        </Badge>
        <span className="text-xs text-ink/50">
          {formatDateShort(start)} – {formatDateShort(end)}
        </span>
      </div>
      {message && <p className="mb-4 rounded-lg bg-cream p-3 text-sm text-ink/70">&ldquo;{message}&rdquo;</p>}
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-ink/70">
        <span>Tier gap: {gap.toFixed(1)}</span>
        <span>Processing fee: {formatMoney(fee)} per owner</span>
      </div>
      {waitingOnMe && (
        <div className="flex gap-2">
          <Button onClick={onAccept} variant="switch">
            Accept swap
          </Button>
          <Button onClick={onDecline} variant="ghost">
            Decline
          </Button>
        </div>
      )}
      {!waitingOnMe && (status === "proposed" || status === "countered") && (
        <p className="text-sm text-ink/60">Waiting for the other owner to respond.</p>
      )}
      {status === "declined" && <p className="text-sm text-ink/60">This proposal was declined.</p>}
    </div>
  );
}
