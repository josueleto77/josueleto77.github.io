"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/icons";
import Button from "@/components/ui/Button";
import { useToast } from "@/lib/store/ToastContext";
import { fetchBlockedDatesForListing, blockDates, unblockDates, type BlockedDateRow } from "@/lib/supabase/availability";
import { formatDateShort, isoToday } from "@/lib/utils/format";

export default function AvailabilityManager({ listingId }: { listingId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<BlockedDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState(isoToday(1));
  const [end, setEnd] = useState(isoToday(2));

  useEffect(() => {
    let cancelled = false;
    fetchBlockedDatesForListing(listingId).then((r) => {
      if (!cancelled) {
        setRows(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  async function add() {
    setAdding(true);
    const { id, error } = await blockDates(listingId, start, end);
    setAdding(false);
    if (!id) {
      toast?.push({ tone: "error", text: error ?? "Couldn't block those dates — try again." });
      return;
    }
    setRows((r) => [...r, { id, listingId, start, end }].sort((a, b) => a.start.localeCompare(b.start)));
    toast?.push({ tone: "success", text: "Dates blocked." });
  }

  async function remove(id: string) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await unblockDates(id);
    if (error) {
      setRows(prev);
      toast?.push({ tone: "error", text: error });
    }
  }

  return (
    <div>
      {loading ? (
        <p className="mt-2 text-sm text-ink/50">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-sage-dark">
          <Icon name="check-circle" className="h-4 w-4" /> No blocked dates.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink/70">
          {rows.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Icon name="x" className="h-3.5 w-3.5 text-coral" />
                {formatDateShort(w.start)} – {formatDateShort(w.end)}
              </span>
              <button onClick={() => remove(w.id)} className="text-xs font-semibold text-ink/40 underline hover:text-coral">
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-navy/10 pt-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-navy/60">From</span>
          <input
            type="date"
            value={start}
            min={isoToday()}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-navy/15 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-navy/60">To</span>
          <input
            type="date"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-navy/15 px-2 py-1.5 text-sm"
          />
        </label>
        <Button size="sm" onClick={add} disabled={adding}>
          {adding ? "Blocking…" : "Block dates"}
        </Button>
      </div>
    </div>
  );
}
