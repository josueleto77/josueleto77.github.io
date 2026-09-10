"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo/Logo";
import Stepper from "@/components/ui/Stepper";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import AgreementModal from "@/components/auth/AgreementModal";
import { useAppData } from "@/lib/store/AppDataContext";
import { useToast } from "@/lib/store/ToastContext";
import type { Role } from "@/lib/types";
import { avatarFor } from "@/lib/utils/ids";

const STEPS = ["Account", "Roles", "Phone", "About you", "Photo", "Verify ID", "Payment", "Review"];

const ROLE_OPTIONS: { value: Role; label: string; body: string; icon: "users" | "home" | "sparkles" }[] = [
  { value: "traveler", label: "Traveler", body: "Book rentals and browse Switch homes.", icon: "users" },
  { value: "host", label: "Host", body: "List a home for short-term rental.", icon: "home" },
  { value: "switch_member", label: "Switch Member", body: "Open your home to reciprocal exchanges.", icon: "sparkles" },
];

interface FormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  dob: string;
  address: string;
  avatarSeed: number;
  idUploaded: boolean;
  cardNumber: string;
  payoutAccount: string;
  roles: Role[];
}

export default function SignupWizard() {
  const router = useRouter();
  const toast = useToast();
  const { signup, acceptAgreement } = useAppData();
  const [step, setStep] = useState(0);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    phone: "",
    dob: "",
    address: "",
    avatarSeed: 1,
    idUploaded: false,
    cardNumber: "",
    payoutAccount: "",
    roles: ["traveler"],
  });

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function toggleRole(role: Role) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  }

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        return form.name.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 6;
      case 1:
        return form.roles.length > 0;
      case 3:
        return form.dob !== "" && form.address.trim().length > 3;
      case 4:
        return true;
      case 5:
        return form.idUploaded;
      case 6: {
        const travelerOk = !form.roles.includes("traveler") || form.cardNumber.length >= 12;
        const hostOk = !form.roles.includes("host") || form.payoutAccount.length >= 4;
        return travelerOk && hostOk;
      }
      default:
        return true;
    }
  }, [step, form]);

  function next() {
    if (step === STEPS.length - 1) {
      setAgreementOpen(true);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function finish() {
    const result = await signup(form.email, form.password, {
      name: form.name,
      phone: form.phone,
      dateOfBirth: form.dob,
      address: form.address,
      avatar: avatarFor(form.avatarSeed),
      roles: form.roles,
    });
    if (!result.ok) {
      toast?.push({ tone: "error", text: result.error ?? "Something went wrong creating your account." });
      return;
    }
    if (result.needsEmailConfirmation) {
      toast?.push({
        tone: "info",
        text: `Almost there — check ${form.email} for a confirmation link before logging in.`,
      });
      router.push("/login");
      return;
    }
    acceptAgreement("terms-of-service", "1.0");
    toast?.push({ tone: "success", text: `Welcome to Redormi, ${form.name.split(" ")[0]}!` });
    router.push(form.roles.includes("host") ? "/dashboard/host" : "/dashboard/guest");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link href="/" className="mb-6 flex justify-center">
        <Logo />
      </Link>
      <div className="mb-6">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm sm:p-8">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-navy">Create your account</h1>
            <Input label="Full name" value={form.name} onChange={(e) => patch({ name: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => patch({ email: e.target.value })} required />
            <Input
              label="Password"
              type="password"
              hint="At least 6 characters."
              value={form.password}
              onChange={(e) => patch({ password: e.target.value })}
              required
            />
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-navy">How will you use Redormi?</h1>
            <p className="text-sm text-ink/60">Pick as many as you like — you can add roles later from your account.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {ROLE_OPTIONS.map((opt) => {
                const active = form.roles.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleRole(opt.value)}
                    className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors ${
                      active ? "border-coral bg-coral/5" : "border-navy/10 hover:border-navy/25"
                    }`}
                  >
                    <Icon name={opt.icon} className={`h-5 w-5 ${active ? "text-coral" : "text-navy/50"}`} />
                    <span className="text-sm font-bold text-navy">{opt.label}</span>
                    <span className="text-xs text-ink/60">{opt.body}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-navy">Phone number</h1>
            <p className="text-sm text-ink/60">
              Optional for now — we&apos;ll use it for booking updates. SMS verification isn&apos;t set up yet, so
              there&apos;s nothing to confirm here.
            </p>
            <Input label="Phone number" type="tel" value={form.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+1 555 010 1000" />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-navy">A little about you</h1>
            <Input label="Date of birth" type="date" value={form.dob} onChange={(e) => patch({ dob: e.target.value })} required />
            <Input label="Home address" value={form.address} onChange={(e) => patch({ address: e.target.value })} placeholder="Street, city, country" required />
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-navy">Add a profile photo</h1>
            <p className="text-sm text-ink/60">Pick an avatar for now — you can upload your own later from Account.</p>
            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: 12 }, (_, i) => i * 5 + 2).map((seed) => (
                <button
                  key={seed}
                  onClick={() => patch({ avatarSeed: seed })}
                  className={`overflow-hidden rounded-full border-2 ${form.avatarSeed === seed ? "border-coral" : "border-transparent"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarFor(seed)} alt={`Avatar option ${seed}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-navy">Verify your identity</h1>
            <p className="text-sm text-ink/60">
              Government-ID verification helps keep Redormi Rent and Switch safe for everyone.
            </p>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-navy/20 p-8 text-center hover:border-coral">
              <Icon name="upload" className="h-6 w-6 text-navy/50" />
              <span className="text-sm font-semibold text-navy">
                {form.idUploaded ? "ID uploaded — pending review" : "Upload a photo of your government ID"}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) patch({ idUploaded: true });
                }}
              />
            </label>
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-5">
            <h1 className="text-xl font-extrabold text-navy">Payment details</h1>
            {form.roles.includes("traveler") && (
              <Input
                label="Card number (for bookings)"
                value={form.cardNumber}
                onChange={(e) => patch({ cardNumber: e.target.value.replace(/\D/g, "").slice(0, 16) })}
                placeholder="4242 4242 4242 4242"
              />
            )}
            {form.roles.includes("host") && (
              <Input
                label="Payout account (for hosting income)"
                value={form.payoutAccount}
                onChange={(e) => patch({ payoutAccount: e.target.value })}
                placeholder="Bank account or linked payout method"
              />
            )}
            <p className="text-xs text-ink/50">Payments are simulated in this demo — no real card is charged.</p>
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-navy">Review & finish</h1>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-ink/50">Name</dt>
              <dd className="font-semibold text-navy">{form.name}</dd>
              <dt className="text-ink/50">Email</dt>
              <dd className="font-semibold text-navy">{form.email}</dd>
              <dt className="text-ink/50">Roles</dt>
              <dd className="font-semibold text-navy">{form.roles.join(", ")}</dd>
              <dt className="text-ink/50">Phone</dt>
              <dd className="font-semibold text-navy">{form.phone || "—"}</dd>
            </dl>
            <p className="text-sm text-ink/60">
              Last step: review and accept the Redormi agreements
              {form.roles.includes("switch_member") ? ", including the Home Exchange Agreement" : ""}.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          <Button onClick={next} disabled={!canContinue}>
            {step === STEPS.length - 1 ? "Review agreements" : "Continue"}
          </Button>
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-coral hover:underline">
          Log in
        </Link>
      </p>

      <AgreementModal
        open={agreementOpen}
        onClose={() => setAgreementOpen(false)}
        includeSwitchAgreement={form.roles.includes("switch_member")}
        onAccept={finish}
      />
    </div>
  );
}
