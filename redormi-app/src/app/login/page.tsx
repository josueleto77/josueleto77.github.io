"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo/Logo";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import { useAppData } from "@/lib/store/AppDataContext";
import { useToast } from "@/lib/store/ToastContext";
import { sendPasswordReset, updatePassword } from "@/lib/supabase/auth";
import { DEMO_USER_ID } from "@/lib/data/users";

type Step = "credentials" | "reset-password" | "reset-email" | "set-new-password";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { login, loginDemo, state } = useAppData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>("credentials");
  const [submitting, setSubmitting] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const demoUser = state.users.find((u) => u.id === DEMO_USER_ID);

  useEffect(() => {
    // A password-reset email link lands back here with a recovery token in
    // the URL hash — Supabase's client auto-exchanges it into a session
    // (detectSessionInUrl: true), so all that's left is to prompt for a
    // new password rather than showing the normal log-in form.
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time URL-driven branch, not derivable from props/state.
      setStep("set-new-password");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.ok) router.push("/dashboard/guest");
  }

  async function requestPasswordReset() {
    setSubmitting(true);
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    await sendPasswordReset(email, redirectTo);
    setSubmitting(false);
    setStep("reset-password");
  }

  async function confirmNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast?.push({ tone: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setSubmitting(false);
    if (error) {
      toast?.push({ tone: "error", text: error });
      return;
    }
    toast?.push({ tone: "success", text: "Password updated — you're logged in." });
    router.push("/dashboard/guest");
  }

  function tryDemo() {
    if (!demoUser) return;
    loginDemo(demoUser.id);
    toast?.push({ tone: "info", text: `Browsing as ${demoUser.name} (demo account, not a real login).` });
    router.push("/dashboard/guest");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full rounded-2xl border border-navy/10 bg-white p-7 shadow-sm">
        {step === "set-new-password" ? (
          <form onSubmit={confirmNewPassword} className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-navy">Set a new password</h1>
            <p className="text-sm text-ink/60">Choose a new password for your account.</p>
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="At least 6 characters."
              required
            />
            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? "Saving…" : "Save password"}
            </Button>
          </form>
        ) : step === "reset-password" ? (
          <div className="flex flex-col gap-4 text-center">
            <Icon name="mail" className="mx-auto h-8 w-8 text-coral" />
            <h1 className="text-xl font-extrabold text-navy">Check your email</h1>
            <p className="text-sm text-ink/60">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
            </p>
            <Button variant="ghost" onClick={() => setStep("credentials")}>
              Back to log in
            </Button>
          </div>
        ) : step === "reset-email" ? (
          <div className="flex flex-col gap-4">
            {recoverySent ? (
              <div className="flex flex-col gap-4 text-center">
                <Icon name="mail" className="mx-auto h-8 w-8 text-coral" />
                <h1 className="text-xl font-extrabold text-navy">Check your email</h1>
                <p className="text-sm text-ink/60">
                  If an account is linked to <strong>{recoveryPhone}</strong>, we&apos;ve sent the email address on
                  file to it in a simulated message.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("credentials");
                    setRecoverySent(false);
                    setRecoveryPhone("");
                  }}
                >
                  Back to log in
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-extrabold text-navy">Find your account email</h1>
                <p className="text-sm text-ink/60">
                  Enter the phone number on your account and we&apos;ll send the associated email address to it.
                </p>
                <Input
                  label="Phone number"
                  type="tel"
                  value={recoveryPhone}
                  onChange={(e) => setRecoveryPhone(e.target.value)}
                  placeholder="+1 555 010 1000"
                />
                <Button fullWidth onClick={() => setRecoverySent(true)} disabled={recoveryPhone.length < 7}>
                  Send
                </Button>
                <Button variant="ghost" onClick={() => setStep("credentials")}>
                  Back to log in
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-xl font-extrabold text-navy">Log in</h1>
            {demoUser && (
              <p className="mb-5 mt-1 text-sm text-ink/60">
                Just want to look around?{" "}
                <button type="button" onClick={tryDemo} className="font-semibold text-coral underline">
                  Browse the demo account
                </button>{" "}
                — no sign-up needed.
              </p>
            )}
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setStep("reset-email")} className="text-xs font-semibold text-coral hover:underline">
                  Forgot email?
                </button>
                <button
                  type="button"
                  onClick={requestPasswordReset}
                  disabled={!email || submitting}
                  className="text-xs font-semibold text-coral hover:underline disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" fullWidth size="lg" disabled={submitting}>
                {submitting ? "Logging in…" : "Log in"}
              </Button>
            </form>
            <p className="mt-5 text-center text-sm text-ink/60">
              New to Redormi?{" "}
              <Link href="/signup" className="font-semibold text-coral hover:underline">
                Sign up
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
