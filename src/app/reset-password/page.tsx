"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

type Status = "checking" | "ready" | "invalid-link" | "saving" | "saved" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // The reset-link redirect carries a one-time code that @supabase/ssr's
    // browser client exchanges for a session automatically on load — this
    // event is Supabase's own signal that that exchange succeeded and the
    // session is specifically a password-recovery one, not a normal sign-in.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });
    // In case the event already fired before this listener was attached.
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        setStatus((s) => (s === "checking" ? (data.session ? "ready" : "invalid-link") : s));
      });
    }, 2500);
    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setStatus("saving");
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus("ready");
      return;
    }
    setStatus("saved");
    setTimeout(() => router.replace("/"), 1500);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <Logo />
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        {status === "checking" && <p className="text-sm text-cream/60">Checking your reset link…</p>}

        {status === "invalid-link" && (
          <>
            <p className="text-sm text-cream">
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <button
              onClick={() => router.replace("/")}
              className="text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline"
            >
              Back to sign in
            </button>
          </>
        )}

        {status === "saved" && <p className="text-sm text-sage">Password updated — taking you back in…</p>}

        {(status === "ready" || status === "saving") && (
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 text-left">
            <p className="text-center text-sm text-cream/70">Choose a new password.</p>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-xl border border-umber bg-umber/40 px-4 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-clay focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-umber bg-umber/40 px-4 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-clay focus:outline-none"
            />
            {error && <p className="text-sm text-clay">{error}</p>}
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-full bg-clay px-5 py-2 text-sm font-medium text-espresso transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "saving" ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
