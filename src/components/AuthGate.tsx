"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";
type Status = "idle" | "loading" | "error" | "check-email";

export default function AuthGate() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const supabase = createClient();

    if (mode === "sign-up") {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        setStatus("error");
        return;
      }
      if (!data.session) {
        // Email confirmation is required before a session is issued.
        setStatus("check-email");
        return;
      }
      router.refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setStatus("error");
      return;
    }
    router.refresh();
  }

  if (status === "check-email") {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <p className="text-sm text-cream">
          Check your email to confirm your account, then sign in.
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setMode("sign-in");
          }}
          className="text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-xl border border-umber bg-umber/40 px-4 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-clay focus:outline-none"
      />
      <input
        type="password"
        required
        minLength={6}
        autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-xl border border-umber bg-umber/40 px-4 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-clay focus:outline-none"
      />
      {error && <p className="text-sm text-clay">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-clay px-5 py-2 text-sm font-medium text-espresso transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? "…" : mode === "sign-up" ? "Create account" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "sign-up" ? "sign-in" : "sign-up");
          setError(null);
        }}
        className="text-sm text-cream/60 underline-offset-2 hover:text-cream hover:underline"
      >
        {mode === "sign-up" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </form>
  );
}
