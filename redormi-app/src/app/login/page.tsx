"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo/Logo";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icons";
import { useAppData } from "@/lib/store/AppDataContext";
import { useToast } from "@/lib/store/ToastContext";
import { DEMO_USER_ID } from "@/lib/data/users";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { login, state } = useAppData();
  const [email, setEmail] = useState("jordan@redormi.demo");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"credentials" | "2fa" | "reset">("credentials");
  const [code, setCode] = useState("");

  const demoUser = state.users.find((u) => u.id === DEMO_USER_ID);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user?.twoFactorEnabled) {
      setStep("2fa");
      return;
    }
    if (login(email)) router.push("/dashboard/guest");
  }

  function confirm2fa(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      toast?.push({ tone: "error", text: "Enter the 6-digit code from your authenticator app." });
      return;
    }
    if (login(email)) router.push("/dashboard/guest");
  }

  function oauth(provider: "Google" | "Apple") {
    toast?.push({ tone: "info", text: `${provider} sign-in is simulated in this demo — logging in as ${demoUser?.name}.` });
    login(email || demoUser?.email || "");
    router.push("/dashboard/guest");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full rounded-2xl border border-navy/10 bg-white p-7 shadow-sm">
        {step === "reset" ? (
          <div className="flex flex-col gap-4 text-center">
            <Icon name="mail" className="mx-auto h-8 w-8 text-coral" />
            <h1 className="text-xl font-extrabold text-navy">Check your email</h1>
            <p className="text-sm text-ink/60">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a simulated password reset link.
            </p>
            <Button variant="ghost" onClick={() => setStep("credentials")}>
              Back to log in
            </Button>
          </div>
        ) : step === "2fa" ? (
          <form onSubmit={confirm2fa} className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold text-navy">Two-factor verification</h1>
            <p className="text-sm text-ink/60">Enter the 6-digit code from your authenticator app. (Demo: any 6 digits work.)</p>
            <Input
              label="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              required
            />
            <Button type="submit" fullWidth>
              Verify & log in
            </Button>
          </form>
        ) : (
          <>
            <h1 className="text-xl font-extrabold text-navy">Log in</h1>
            <p className="mb-5 mt-1 text-sm text-ink/60">
              Demo tip: use <button type="button" onClick={() => setEmail(demoUser?.email ?? "")} className="font-semibold text-coral underline">{demoUser?.email}</button> to explore a fully populated account.
            </p>
            <div className="mb-5 flex flex-col gap-2">
              <Button variant="outline" fullWidth onClick={() => oauth("Google")} icon={<Icon name="external-link" className="h-4 w-4" />}>
                Continue with Google
              </Button>
              <Button variant="outline" fullWidth onClick={() => oauth("Apple")} icon={<Icon name="external-link" className="h-4 w-4" />}>
                Continue with Apple
              </Button>
            </div>
            <div className="mb-5 flex items-center gap-3 text-xs text-ink/40">
              <span className="h-px flex-1 bg-navy/10" /> or <span className="h-px flex-1 bg-navy/10" />
            </div>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Any password works in this demo" />
              <button type="button" onClick={() => setStep("reset")} className="self-end text-xs font-semibold text-coral hover:underline">
                Forgot password?
              </button>
              <Button type="submit" fullWidth size="lg">
                Log in
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
