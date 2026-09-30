"use client";

import { useRef, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Input, { Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/icons";
import IdentityVerificationCard from "@/components/account/IdentityVerificationCard";
import { useAppData } from "@/lib/store/AppDataContext";
import { ALL_LEGAL_DOCS } from "@/lib/legal/registry";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { uploadAvatar, upsertProfile } from "@/lib/supabase/auth";
import { startBillingPortal } from "@/lib/supabase/payments";
import { useToast } from "@/lib/store/ToastContext";

export default function AccountClient() {
  const { currentUser, updateUser, state } = useAppData();
  const toast = useToast();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-lg font-bold text-navy">Log in to view your account</p>
        <Button href="/login" className="mt-4">
          Log in
        </Button>
      </div>
    );
  }

  const myAcceptances = state.acceptances.filter((a) => a.userId === currentUser.id);
  const myTransactions = state.bookings
    .filter((b) => b.guestId === currentUser.id && b.paymentStatus === "paid")
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function save() {
    setSaving(true);
    const updated = await upsertProfile(currentUser!.id, { name, bio });
    setSaving(false);
    if (!updated) {
      toast?.push({ tone: "error", text: "Couldn't save changes — try again." });
      return;
    }
    updateUser(currentUser!.id, updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentUser) return;
    setUploadingAvatar(true);
    const url = await uploadAvatar(currentUser.id, file);
    if (!url) {
      toast?.push({ tone: "error", text: "Couldn't upload that photo — try again." });
      setUploadingAvatar(false);
      return;
    }
    const updated = await upsertProfile(currentUser.id, { avatar_url: url });
    setUploadingAvatar(false);
    if (!updated) {
      toast?.push({ tone: "error", text: "Photo uploaded but couldn't save it to your profile — try again." });
      return;
    }
    updateUser(currentUser.id, updated);
  }

  async function manageBilling() {
    setOpeningPortal(true);
    const { url, error } = await startBillingPortal(window.location.href);
    if (error || !url) {
      toast?.push({ tone: "error", text: error ?? "Couldn't open billing settings — try again." });
      setOpeningPortal(false);
      return;
    }
    window.location.href = url;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Account</h1>

      <section className="mb-8 rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="mb-4 text-lg font-extrabold text-navy">Profile</h2>
        <div className="mb-4 flex items-center gap-4">
          <div className="relative">
            <Avatar src={currentUser.avatar} name={currentUser.name} size={64} />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Change profile picture"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-coral text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-60"
            >
              <Icon name="camera" className="h-3.5 w-3.5" />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelected} />
          </div>
          <div className="text-sm text-ink/60">
            {uploadingAvatar ? (
              "Uploading photo…"
            ) : (
              <>
                Member since {formatDate(currentUser.memberSince)} · {currentUser.roles.join(", ")}
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={currentUser.email} disabled />
          <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          <Button onClick={save} className="w-fit" disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
          </Button>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="mb-4 text-lg font-extrabold text-navy">Verification</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tone={currentUser.verification.identity === "verified" ? "sage" : "cream"} icon={<Icon name="shield-check" className="h-3.5 w-3.5" />}>
            Identity: {currentUser.verification.identity}
          </Badge>
          <Badge tone={currentUser.verification.email ? "sage" : "cream"}>Email {currentUser.verification.email ? "verified" : "unverified"}</Badge>
          <Badge tone={currentUser.verification.phone ? "sage" : "cream"}>Phone {currentUser.verification.phone ? "verified" : "unverified"}</Badge>
        </div>
        <div className="mt-4">
          <Toggle
            label="Two-factor authentication"
            description="Require a verification code at login."
            checked={!!currentUser.twoFactorEnabled}
            onChange={(v) => updateUser(currentUser.id, { twoFactorEnabled: v })}
          />
        </div>
      </section>

      <section className="mb-8">
        <IdentityVerificationCard userId={currentUser.id} />
      </section>

      <section className="mb-8 rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="mb-1 text-lg font-extrabold text-navy">Payment methods</h2>
        <p className="mb-4 text-sm text-ink/60">Add, switch your default, or remove saved cards — handled securely by Stripe.</p>
        <Button size="sm" onClick={manageBilling} disabled={openingPortal}>
          {openingPortal ? "Opening…" : "Manage payment methods"}
        </Button>
      </section>

      <section className="mb-8 rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="mb-1 text-lg font-extrabold text-navy">Billing</h2>
        <p className="mb-4 text-sm text-ink/60">Every payment you&apos;ve made on Redormi.</p>
        {myTransactions.length === 0 ? (
          <p className="text-sm text-ink/50">No payments yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-navy/8">
            {myTransactions.map((t) => {
              const listing = state.listings.find((l) => l.id === t.listingId);
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-navy">{listing?.title ?? "Stay"}</p>
                    <p className="text-xs text-ink/50">
                      {formatDate(t.createdAt)} · {formatDate(t.checkIn)} – {formatDate(t.checkOut)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-navy">{formatMoney(t.total)}</p>
                    <Badge tone="sage">Paid</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="mb-1 text-lg font-extrabold text-navy">Agreement history</h2>
        <p className="mb-4 text-sm text-ink/60">A record of every policy you&apos;ve accepted, with timestamp and version.</p>
        {myAcceptances.length === 0 ? (
          <p className="text-sm text-ink/50">No agreements accepted in this session yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-navy/8">
            {myAcceptances.map((a) => {
              const doc = ALL_LEGAL_DOCS.find((d) => d.slug === a.documentSlug);
              return (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-navy">{doc?.title ?? a.documentSlug}</span>
                  <span className="text-xs text-ink/50">
                    v{a.version} · {formatDate(a.acceptedAt)} · {a.ip}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
