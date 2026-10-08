"use client";

import { useState } from "react";
import Link from "next/link";
import type { Presentation } from "@/lib/schema";
import AuthGate from "./AuthGate";
import Logo from "./Logo";
import ExamplePreviewModal from "./ExamplePreviewModal";
import { CREDIT_PACKS, formatPrice } from "@/lib/creditPacks";

export default function SignedOutLanding({ examplePresentation }: { examplePresentation: Presentation }) {
  const [showExample, setShowExample] = useState(false);
  const cheapestPack = CREDIT_PACKS[0];

  return (
    <main className="flex flex-1 flex-col items-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo />
        <h1 className="font-display max-w-lg text-3xl text-cream md:text-4xl">
          Your notes, turned into a finished presentation.
        </h1>
        <p className="max-w-md text-sm text-cream/70">
          Paste your notes, add a photo of your textbook or diagram, and Powerly puts together a clear, editable
          slide deck in under a minute.
        </p>
        <button
          onClick={() => setShowExample(true)}
          className="mt-1 rounded-full border border-sage/50 px-4 py-1.5 text-sm text-sage transition hover:bg-sage/10"
        >
          See an example deck →
        </button>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-umber bg-umber/20 p-6">
        <AuthGate />
      </div>

      <div className="flex flex-col items-center gap-1 text-center text-xs text-cream/40">
        <p>
          Free to start — 3 export credits included. More from {formatPrice(cheapestPack.amountCents)}, no
          subscription.
        </p>
        <p>
          <Link href="/terms" className="underline-offset-2 hover:text-cream/70 hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline-offset-2 hover:text-cream/70 hover:underline">
            Privacy
          </Link>
        </p>
      </div>

      {showExample && (
        <ExamplePreviewModal presentation={examplePresentation} onClose={() => setShowExample(false)} />
      )}
    </main>
  );
}
