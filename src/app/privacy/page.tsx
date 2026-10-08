import Link from "next/link";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16 text-sm text-cream/80">
      <Link href="/" className="text-xs text-cream/50 underline-offset-2 hover:text-cream hover:underline">
        ← Back to Powerly
      </Link>
      <h1 className="font-display text-2xl text-cream">Privacy</h1>
      <p className="text-xs text-cream/50">Last updated October 2026.</p>

      <p>Here&apos;s plainly what Powerly stores and why.</p>

      <h2 className="mt-2 text-cream">Account info</h2>
      <p>
        Your email and password are used only to sign you in. Passwords are handled by Supabase (our
        authentication provider) and are never visible to us in plain text.
      </p>

      <h2 className="mt-2 text-cream">Your notes, photos, and presentations</h2>
      <p>
        Notes and photos you submit are sent to Anthropic&apos;s API to generate your slides, and aren&apos;t used
        to train any AI model. Saved presentations are stored in our database (Supabase), tied to your account
        only — nobody else can see them.
      </p>

      <h2 className="mt-2 text-cream">Payment</h2>
      <p>
        If you buy export credits, payment is handled entirely by Stripe. Powerly never sees or stores your card
        details — we only receive confirmation that a payment succeeded.
      </p>

      <h2 className="mt-2 text-cream">What we don&apos;t do</h2>
      <p>We don&apos;t sell your data, and we don&apos;t share it with anyone outside the services named above that make Powerly work.</p>

      <h2 className="mt-2 text-cream">Deleting your data</h2>
      <p>
        You can delete any saved presentation yourself at any time. To delete your account and all associated
        data entirely, ask whoever shared this app with you.
      </p>

      <p className="mt-4 text-xs text-cream/40">
        Powerly is a small, independently-run project — this is a plain-language summary, not a formal legal
        document.
      </p>
    </main>
  );
}
