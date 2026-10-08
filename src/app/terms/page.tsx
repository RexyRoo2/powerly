import Link from "next/link";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-16 text-sm text-cream/80">
      <Link href="/" className="text-xs text-cream/50 underline-offset-2 hover:text-cream hover:underline">
        ← Back to Powerly
      </Link>
      <h1 className="font-display text-2xl text-cream">Terms of use</h1>
      <p className="text-xs text-cream/50">Last updated October 2026.</p>

      <p>
        Powerly is a small, independently-run tool that turns notes and photos you provide into a slide
        presentation. By using it, you&apos;re agreeing to the following, in plain terms:
      </p>

      <h2 className="mt-2 text-cream">What you can expect</h2>
      <p>
        Powerly generates presentations using an AI model based only on the notes and images you give it. It
        doesn&apos;t look up outside facts or verify what you submit — check anything important before you present
        it, the same way you&apos;d check a classmate&apos;s notes.
      </p>

      <h2 className="mt-2 text-cream">Your account and content</h2>
      <p>
        You&apos;re responsible for keeping your login secure. Don&apos;t upload anything you don&apos;t have the
        right to use, or anything containing someone else&apos;s private information. You keep ownership of the
        notes, photos, and presentations you create — Powerly only stores them so you can come back to them.
      </p>

      <h2 className="mt-2 text-cream">Credits and payment</h2>
      <p>
        New accounts start with a small number of free export credits. Additional credits can be purchased and are
        one-time (not a subscription) — they don&apos;t expire, and they&apos;re not refundable once used, though
        we&apos;ll always try to make things right if something on our end goes wrong.
      </p>

      <h2 className="mt-2 text-cream">No guarantees</h2>
      <p>
        Powerly is provided as-is, without warranty of any kind. It&apos;s a small project, not an enterprise
        product — things may break occasionally, and we&apos;ll fix what we can as quickly as we can, but we can&apos;t
        promise it&apos;ll always be perfect or always available.
      </p>

      <h2 className="mt-2 text-cream">Changes</h2>
      <p>
        These terms may change as Powerly grows. If anything significant changes, we&apos;ll update this page.
      </p>

      <p className="mt-4 text-xs text-cream/40">
        Questions? Reach out to whoever shared this app with you, or the account holder listed in Settings.
      </p>
    </main>
  );
}
