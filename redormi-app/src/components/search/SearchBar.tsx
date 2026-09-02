"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/I18nContext";
import { isoToday } from "@/lib/utils/format";

export default function SearchBar({
  variant = "hero",
  initial,
}: {
  variant?: "hero" | "compact";
  initial?: { where?: string; checkIn?: string; checkOut?: string; guests?: string; mode?: string };
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [where, setWhere] = useState(initial?.where ?? "");
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? "2");
  const [mode, setMode] = useState<"rent" | "switch">((initial?.mode as "rent" | "switch") ?? "rent");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (where) params.set("where", where);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);
    params.set("mode", mode);
    router.push(mode === "switch" ? `/switch?${params.toString()}` : `/search?${params.toString()}`);
  }

  const compact = variant === "compact";

  return (
    <form
      onSubmit={submit}
      className={`w-full rounded-2xl border border-navy/10 bg-white shadow-lg ${compact ? "p-2" : "p-2.5 sm:p-3"}`}
    >
      <div className={`mb-2 flex w-fit rounded-full bg-cream p-1 ${compact ? "hidden sm:flex" : ""}`}>
        <button
          type="button"
          onClick={() => setMode("rent")}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
            mode === "rent" ? "bg-coral text-white" : "text-navy/60"
          }`}
        >
          {dict.search.rentMode}
        </button>
        <button
          type="button"
          onClick={() => setMode("switch")}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
            mode === "switch" ? "bg-sage text-navy" : "text-navy/60"
          }`}
        >
          {dict.search.switchMode}
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0 sm:divide-x sm:divide-navy/10">
        <label className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-navy/5 sm:rounded-l-xl sm:rounded-r-none">
          <Icon name="map-pin" className="h-4 w-4 shrink-0 text-navy/40" />
          <span className="flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-navy/40">
              {dict.search.whereTo}
            </span>
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Search destinations"
              className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:font-normal placeholder:text-ink/40"
            />
          </span>
        </label>

        <label className="flex flex-1 items-center gap-2 px-3 py-2.5 hover:bg-navy/5">
          <Icon name="calendar" className="h-4 w-4 shrink-0 text-navy/40" />
          <span className="flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-navy/40">
              {dict.search.checkIn}
            </span>
            <input
              type="date"
              value={checkIn}
              min={isoToday()}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-navy outline-none"
            />
          </span>
        </label>

        <label className="flex flex-1 items-center gap-2 px-3 py-2.5 hover:bg-navy/5">
          <Icon name="calendar" className="h-4 w-4 shrink-0 text-navy/40" />
          <span className="flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-navy/40">
              {dict.search.checkOut}
            </span>
            <input
              type="date"
              value={checkOut}
              min={checkIn || isoToday()}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-navy outline-none"
            />
          </span>
        </label>

        <label className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-navy/5 sm:rounded-r-xl sm:rounded-l-none">
          <Icon name="users" className="h-4 w-4 shrink-0 text-navy/40" />
          <span className="flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-navy/40">
              {dict.search.guests}
            </span>
            <input
              type="number"
              min={1}
              max={16}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-navy outline-none"
            />
          </span>
        </label>

        <button
          type="submit"
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-coral px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-coral-dark sm:mt-0 sm:ml-2 sm:rounded-xl"
        >
          <Icon name="search" className="h-4 w-4" />
          {dict.search.search}
        </button>
      </div>
    </form>
  );
}
