"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import { useAppData } from "@/lib/store/AppDataContext";
import { useToast } from "@/lib/store/ToastContext";
import Input from "@/components/ui/Input";
import { fetchAllListingsForAdmin } from "@/lib/supabase/listings";
import { fetchAllProfiles, inviteUser, moderate, updateUserPowers, type UserPowers } from "@/lib/supabase/admin";
import { fetchAllDisputesForAdmin } from "@/lib/supabase/disputes";
import { formatDate } from "@/lib/utils/format";
import { listingHref } from "@/lib/utils/listingHref";
import type { Dispute, Listing, User } from "@/lib/types";

const DISPUTE_CATEGORY_LABEL: Record<Dispute["category"], string> = {
  not_as_described: "Not as described",
  damage: "Property damage",
  payment: "Payment issue",
  no_show: "No-show",
  behavior: "Behavior",
  other: "Other",
};

export default function AdminClient() {
  const { currentUser } = useAppData();
  const toast = useToast();
  const [tab, setTab] = useState("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePowers, setInvitePowers] = useState<UserPowers>({ isAdmin: false, isHost: false, isSwitchMember: false });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!currentUser?.isAdmin) return;
    let cancelled = false;
    Promise.all([fetchAllListingsForAdmin(), fetchAllProfiles(), fetchAllDisputesForAdmin()]).then(([l, u, d]) => {
      if (cancelled) return;
      setListings(l);
      setUsers(u);
      setDisputes(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.isAdmin]);

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-lg font-bold text-navy">Log in to continue</p>
        <Button href="/login" className="mt-4">
          Log in
        </Button>
      </div>
    );
  }

  if (!currentUser.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Icon name="lock" className="mx-auto h-8 w-8 text-navy/40" />
        <p className="mt-3 text-lg font-bold text-navy">Not authorized</p>
        <p className="mt-1 text-sm text-ink/60">This page is only for Redormi admins.</p>
      </div>
    );
  }

  async function removeListing(id: string) {
    const reason = reasonDrafts[id];
    setActingId(id);
    const { error } = await moderate("remove_listing", id, reason || undefined);
    setActingId(null);
    if (error) {
      toast?.push({ tone: "error", text: error });
      return;
    }
    setReasonDrafts((d) => ({ ...d, [id]: "" }));
    setListings((ls) => ls.map((l) => (l.id === id ? { ...l, status: "draft", removedAt: new Date().toISOString(), removedReason: reason || undefined } : l)));
    toast?.push({ tone: "success", text: "Listing removed." });
  }

  async function restoreListing(id: string) {
    setActingId(id);
    const { error } = await moderate("restore_listing", id);
    setActingId(null);
    if (error) {
      toast?.push({ tone: "error", text: error });
      return;
    }
    setListings((ls) => ls.map((l) => (l.id === id ? { ...l, status: "published", removedAt: undefined, removedReason: undefined } : l)));
    toast?.push({ tone: "success", text: "Listing restored." });
  }

  async function suspendUser(id: string) {
    const reason = reasonDrafts[id];
    setActingId(id);
    const { error } = await moderate("suspend_user", id, reason || undefined);
    setActingId(null);
    if (error) {
      toast?.push({ tone: "error", text: error });
      return;
    }
    setReasonDrafts((d) => ({ ...d, [id]: "" }));
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, suspendedAt: new Date().toISOString(), suspendedReason: reason || undefined } : u)));
    toast?.push({ tone: "success", text: "Account suspended." });
  }

  async function unsuspendUser(id: string) {
    setActingId(id);
    const { error } = await moderate("unsuspend_user", id);
    setActingId(null);
    if (error) {
      toast?.push({ tone: "error", text: error });
      return;
    }
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, suspendedAt: undefined, suspendedReason: undefined } : u)));
    toast?.push({ tone: "success", text: "Account reinstated." });
  }

  async function submitInvite() {
    if (!inviteEmail.includes("@")) {
      toast?.push({ tone: "error", text: "Enter a valid email address." });
      return;
    }
    setInviting(true);
    const { user, error } = await inviteUser(inviteEmail, inviteName, invitePowers);
    setInviting(false);
    if (!user) {
      toast?.push({ tone: "error", text: error ?? "Couldn't invite that user." });
      return;
    }
    setUsers((us) => [user, ...us]);
    setInviteEmail("");
    setInviteName("");
    setInvitePowers({ isAdmin: false, isHost: false, isSwitchMember: false });
    toast?.push({ tone: "success", text: `Invited ${user.email}.` });
  }

  async function toggleUserPower(u: User, key: keyof UserPowers) {
    const powers: UserPowers = {
      isAdmin: u.isAdmin ?? false,
      isHost: u.isHost,
      isSwitchMember: u.isSwitchMember,
      [key]: !(key === "isAdmin" ? (u.isAdmin ?? false) : u[key]),
    };
    setActingId(u.id);
    const { error } = await updateUserPowers(u.id, powers);
    setActingId(null);
    if (error) {
      toast?.push({ tone: "error", text: error });
      return;
    }
    setUsers((us) =>
      us.map((x) => (x.id === u.id ? { ...x, isAdmin: powers.isAdmin, isHost: powers.isHost, isSwitchMember: powers.isSwitchMember } : x))
    );
  }

  async function markDisputeReviewing(id: string) {
    setActingId(id);
    const { error } = await moderate("mark_dispute_reviewing", id);
    setActingId(null);
    if (error) {
      toast?.push({ tone: "error", text: error });
      return;
    }
    setDisputes((ds) => ds.map((d) => (d.id === id ? { ...d, status: "reviewing" } : d)));
    toast?.push({ tone: "success", text: "Dispute marked as reviewing." });
  }

  async function resolveDispute(id: string) {
    const note = reasonDrafts[id];
    setActingId(id);
    const { error } = await moderate("resolve_dispute", id, note || undefined);
    setActingId(null);
    if (error) {
      toast?.push({ tone: "error", text: error });
      return;
    }
    setReasonDrafts((d) => ({ ...d, [id]: "" }));
    setDisputes((ds) =>
      ds.map((d) => (d.id === id ? { ...d, status: "resolved", resolutionNote: note || undefined, resolvedAt: new Date().toISOString() } : d))
    );
    toast?.push({ tone: "success", text: "Dispute resolved." });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-extrabold text-navy">Admin</h1>
      <p className="mb-6 text-sm text-ink/60">Moderate listings and accounts.</p>

      <Tabs
        items={[
          { key: "listings", label: "Listings", count: listings.length },
          { key: "users", label: "Users", count: users.length },
          { key: "disputes", label: "Disputes", count: disputes.filter((d) => d.status !== "resolved").length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : tab === "disputes" ? (
          disputes.length === 0 ? (
            <p className="text-sm text-ink/50">No disputes.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {disputes.map((d) => {
                const raisedBy = users.find((u) => u.id === d.raisedById);
                const against = users.find((u) => u.id === d.againstId);
                const isActing = actingId === d.id;
                const isResolved = d.status === "resolved";
                return (
                  <div key={d.id} className="rounded-2xl border border-navy/10 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-navy">{DISPUTE_CATEGORY_LABEL[d.category]}</p>
                        <p className="text-xs text-ink/60">
                          {raisedBy?.name ?? raisedBy?.email ?? "Unknown"} vs {against?.name ?? against?.email ?? "Unknown"} · {formatDate(d.createdAt)}
                        </p>
                        <p className="mt-1 text-xs text-ink/70">{d.reason}</p>
                        {isResolved && (
                          <p className="mt-1 text-xs text-ink/50">
                            Resolved {d.resolvedAt && formatDate(d.resolvedAt)}
                            {d.resolutionNote && ` — ${d.resolutionNote}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={d.status === "resolved" ? "sage" : d.status === "reviewing" ? "cream" : "coral"} className="capitalize">
                          {d.status}
                        </Badge>
                        {!isResolved && (
                          <>
                            {d.status === "open" && (
                              <Button size="sm" variant="outline" onClick={() => markDisputeReviewing(d.id)} disabled={isActing}>
                                {isActing ? "…" : "Mark reviewing"}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => resolveDispute(d.id)} disabled={isActing}>
                              {isActing ? "…" : "Resolve"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {!isResolved && (
                      <input
                        type="text"
                        value={reasonDrafts[d.id] ?? ""}
                        onChange={(e) => setReasonDrafts((rd) => ({ ...rd, [d.id]: e.target.value }))}
                        placeholder="Resolution note (optional, shown to both parties)"
                        className="mt-2 w-full rounded-lg border border-navy/10 px-2 py-1 text-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : tab === "listings" ? (
          <div className="flex flex-col gap-3">
            {listings.map((l) => {
              const isRemoved = !!l.removedAt;
              const isActing = actingId === l.id;
              return (
                <div key={l.id} className="rounded-2xl border border-navy/10 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link href={listingHref(l.id)} className="text-sm font-bold text-navy hover:text-coral">
                        {l.title}
                      </Link>
                      <p className="text-xs text-ink/60">
                        {l.city}, {l.country} · Listed {formatDate(l.createdAt)}
                      </p>
                      {isRemoved && (
                        <p className="mt-1 text-xs text-coral">
                          Removed {formatDate(l.removedAt!)}
                          {l.removedReason && ` — ${l.removedReason}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={l.status === "published" ? "sage" : "cream"} className="capitalize">
                        {l.status}
                      </Badge>
                      {isRemoved ? (
                        <Button size="sm" variant="outline" onClick={() => restoreListing(l.id)} disabled={isActing}>
                          {isActing ? "…" : "Restore"}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => removeListing(l.id)} disabled={isActing}>
                          {isActing ? "…" : "Remove"}
                        </Button>
                      )}
                    </div>
                  </div>
                  {!isRemoved && (
                    <input
                      type="text"
                      value={reasonDrafts[l.id] ?? ""}
                      onChange={(e) => setReasonDrafts((d) => ({ ...d, [l.id]: e.target.value }))}
                      placeholder="Reason for removal (optional, shown to host)"
                      className="mt-2 w-full rounded-lg border border-navy/10 px-2 py-1 text-xs"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-navy/10 bg-white p-4">
              <p className="mb-3 text-sm font-bold text-navy">Invite a new user</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input label="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                <Input label="Name (optional)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-navy">
                {(
                  [
                    ["isAdmin", "Admin"],
                    ["isHost", "Host"],
                    ["isSwitchMember", "Switch member"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={invitePowers[key]}
                      onChange={(e) => setInvitePowers((p) => ({ ...p, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <Button size="sm" className="mt-3" onClick={submitInvite} disabled={inviting || !inviteEmail}>
                {inviting ? "Inviting…" : "Send invite"}
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {users.map((u) => {
                const isSuspended = !!u.suspendedAt;
                const isActing = actingId === u.id;
                const isSelf = u.id === currentUser.id;
                return (
                  <div key={u.id} className="rounded-2xl border border-navy/10 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-navy">{u.name || u.email}</p>
                        <p className="text-xs text-ink/60">
                          {u.email} · Member since {formatDate(u.memberSince)}
                        </p>
                        {isSuspended && (
                          <p className="mt-1 text-xs text-coral">
                            Suspended {formatDate(u.suspendedAt!)}
                            {u.suspendedReason && ` — ${u.suspendedReason}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isSuspended ? (
                          <Button size="sm" variant="outline" onClick={() => unsuspendUser(u.id)} disabled={isActing}>
                            {isActing ? "…" : "Reinstate"}
                          </Button>
                        ) : (
                          !isSelf && (
                            <Button size="sm" variant="outline" onClick={() => suspendUser(u.id)} disabled={isActing}>
                              {isActing ? "…" : "Suspend"}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(
                        [
                          ["isAdmin", "Admin"],
                          ["isHost", "Host"],
                          ["isSwitchMember", "Switch member"],
                        ] as const
                      ).map(([key, label]) => {
                        const active = key === "isAdmin" ? !!u.isAdmin : u[key];
                        const disabled = isActing || (key === "isAdmin" && isSelf);
                        return (
                          <button
                            key={key}
                            onClick={() => toggleUserPower(u, key)}
                            disabled={disabled}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                              active ? "bg-navy text-white" : "border border-navy/15 text-navy/60"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {!isSuspended && !isSelf && (
                      <input
                        type="text"
                        value={reasonDrafts[u.id] ?? ""}
                        onChange={(e) => setReasonDrafts((d) => ({ ...d, [u.id]: e.target.value }))}
                        placeholder="Reason for suspension (optional)"
                        className="mt-2 w-full rounded-lg border border-navy/10 px-2 py-1 text-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
