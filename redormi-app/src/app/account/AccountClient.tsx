"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Input, { Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/icons";
import { useAppData } from "@/lib/store/AppDataContext";
import { ALL_LEGAL_DOCS } from "@/lib/legal/registry";
import { formatDate } from "@/lib/utils/format";

export default function AccountClient() {
  const { currentUser, updateUser, state } = useAppData();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  const [saved, setSaved] = useState(false);

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

  function save() {
    updateUser(currentUser!.id, { name, bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-extrabold text-navy">Account</h1>

      <section className="mb-8 rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="mb-4 text-lg font-extrabold text-navy">Profile</h2>
        <div className="mb-4 flex items-center gap-4">
          <Avatar src={currentUser.avatar} name={currentUser.name} size={64} />
          <div className="text-sm text-ink/60">
            Member since {formatDate(currentUser.memberSince)} · {currentUser.roles.join(", ")}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={currentUser.email} disabled />
          <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
          <Button onClick={save} className="w-fit">
            {saved ? "Saved!" : "Save changes"}
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

      <section className="mb-8 rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="mb-4 text-lg font-extrabold text-navy">Payment methods & documents</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-cream p-3">
            <span className="flex items-center gap-2 text-navy">
              <Icon name="credit-card" className="h-4 w-4" /> Visa •••• 4242
            </span>
            <span className="text-ink/50">Default</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-cream p-3">
            <span className="flex items-center gap-2 text-navy">
              <Icon name="upload" className="h-4 w-4" /> Government ID
            </span>
            <Badge tone={currentUser.verification.identity === "verified" ? "sage" : "cream"}>{currentUser.verification.identity}</Badge>
          </div>
        </div>
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
